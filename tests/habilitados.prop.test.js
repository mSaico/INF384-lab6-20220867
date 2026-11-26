/**
 * Tests de propiedades (PBT) para POST /habilitados
 * Tarea 6: Propiedades 1-4 del diseño
 *
 * PRNG: LCG determinista (semilla fija = 42) para reproducibilidad total,
 * sin dependencias externas.
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../src/app');

// ─── PRNG determinista ───────────────────────────────────────────────────────

/**
 * LCG (Linear Congruential Generator) con parámetros de glibc.
 * Devuelve valores en [0, 1).
 */
function crearPRNG(seed = 42) {
  let s = seed;
  return () => {
    s = (1103515245 * s + 12345) % 2147483648;
    return s / 2147483648; // [0, 1)
  };
}

// ─── Datos de referencia ─────────────────────────────────────────────────────

const RUTA_JSON = path.join(__dirname, '..', 'data', 'cursos.json');
const { courses: CURSOS } = JSON.parse(fs.readFileSync(RUTA_JSON, 'utf8'));
const TODOS_IDS = CURSOS.map((c) => c.id); // 87 ids

/** Calcula el modelo de referencia en el test, sin pasar por el router. */
function modeloReferencia(aprobados) {
  const set = new Set(aprobados);
  return CURSOS.filter(
    (c) => !set.has(c.id) && c.prerequisites.every((pr) => set.has(pr)),
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Fisher-Yates shuffle usando el PRNG dado. */
function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Genera un código válido (6 chars [A-Z0-9]) usando el PRNG. */
function codigoValido(rng) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let cod = '';
  for (let i = 0; i < 6; i++) {
    cod += chars[Math.floor(rng() * chars.length)];
  }
  return cod;
}

// ─── Property 1: Equivalencia con el modelo de referencia ────────────────────

test('Property 1 (req 1.2, 1.3, 1.4, 2.4): equivalencia con el modelo de referencia', async () => {
  const rng = crearPRNG(42);

  for (let iter = 0; iter < 100; iter++) {
    // Subconjunto aleatorio de los 87 ids reales
    const aprobados = TODOS_IDS.filter(() => rng() < 0.5);

    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const idsRespuesta = new Set(res.body.map((c) => c.id));
    const idsEsperados = new Set(modeloReferencia(aprobados).map((c) => c.id));

    // Mismo tamaño
    expect(idsRespuesta.size).toBe(idsEsperados.size);

    // Mismos elementos
    for (const id of idsEsperados) {
      expect(idsRespuesta.has(id)).toBe(true);
    }

    // No hay extra
    for (const id of idsRespuesta) {
      expect(idsEsperados.has(id)).toBe(true);
    }
  }
}, 30000);

// ─── Property 2: Rechazo de elementos inválidos ──────────────────────────────

test('Property 2 (req 2.1, 2.2, 2.3, 4.1): rechazo de elementos inválidos', async () => {
  const rng = crearPRNG(42);

  /**
   * Genera una string inválida. Categorías rotadas con el PRNG:
   * 0 – minúsculas (código válido en lowercase)
   * 1 – <script> inyectado
   * 2 – longitud 5
   * 3 – longitud 7
   * 4 – caracteres especiales
   * 5 – string vacía
   */
  function stringInvalida(rng) {
    const cat = Math.floor(rng() * 6);
    switch (cat) {
      case 0:
        return codigoValido(rng).toLowerCase();
      case 1:
        return codigoValido(rng).slice(0, 4) + '<s>';
      case 2: {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let s = '';
        for (let i = 0; i < 5; i++) s += chars[Math.floor(rng() * chars.length)];
        return s;
      }
      case 3: {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let s = '';
        for (let i = 0; i < 7; i++) s += chars[Math.floor(rng() * chars.length)];
        return s;
      }
      case 4:
        return '!@#$%^';
      case 5:
      default:
        return '';
    }
  }

  // 100 strings inválidas como strings
  for (let iter = 0; iter < 100; iter++) {
    const invalido = stringInvalida(rng);
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: [invalido] });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(Array.isArray(res.body)).toBe(false);
  }

  // Elementos no-string: número, null, boolean, objeto
  const noStrings = [
    [42],
    [null],
    [true],
    [false],
    [{}],
    [1, '1INF25'],     // mezcla
    [null, '1INF25'],
  ];
  for (const payload of noStrings) {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: payload });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  }
}, 30000);

// ─── Property 3: Rechazo por tamaño > 150 ────────────────────────────────────

test('Property 3 (req 3.1): rechazo por tamaño > 150', async () => {
  const rng = crearPRNG(42);

  for (let iter = 0; iter < 5; iter++) {
    // Tamaño entre 151 y 200
    const tamanio = 151 + Math.floor(rng() * 50);
    const aprobados = Array.from({ length: tamanio }, () => codigoValido(rng));

    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  }
}, 15000);

// ─── Property 4: Estabilidad ante reorden y duplicados ───────────────────────

test('Property 4 (req 1.2, 1.3): estabilidad ante reorden y duplicados', async () => {
  const rng = crearPRNG(42);

  for (let iter = 0; iter < 50; iter++) {
    // Subconjunto aleatorio de ids reales (sin duplicados, sin límite de tamaño)
    const aprobados = TODOS_IDS.filter(() => rng() < 0.4);

    // R1 — lista original
    const r1 = await request(app)
      .post('/habilitados')
      .send({ aprobados });
    expect(r1.status).toBe(200);

    // R2 — lista reordenada (Fisher-Yates con PRNG)
    const aprobadosShuffled = shuffle(aprobados, rng);
    const r2 = await request(app)
      .post('/habilitados')
      .send({ aprobados: aprobadosShuffled });
    expect(r2.status).toBe(200);

    // R3 — duplicados truncados a 150
    // Concatenar la lista consigo misma y truncar a min(150, 2*n)
    const aprobadosDuplicados = [...aprobados, ...aprobados].slice(0, 150);
    const r3 = await request(app)
      .post('/habilitados')
      .send({ aprobados: aprobadosDuplicados });
    expect(r3.status).toBe(200);

    // Comparar como conjuntos de ids (el orden de la respuesta es estable
    // porque depende del repositorio, no de la entrada)
    const ids1 = new Set(r1.body.map((c) => c.id));
    const ids2 = new Set(r2.body.map((c) => c.id));
    const ids3 = new Set(r3.body.map((c) => c.id));

    expect(ids1.size).toBe(ids2.size);
    expect(ids1.size).toBe(ids3.size);

    for (const id of ids1) {
      expect(ids2.has(id)).toBe(true);
      expect(ids3.has(id)).toBe(true);
    }
  }
}, 60000);
