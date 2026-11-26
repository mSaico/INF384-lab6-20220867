const request = require('supertest');
const express = require('express');
const habilitadosRouter = require('../src/routes/habilitados');

// Mini-app local: el router aún no está montado en src/app.js (tarea 4.1).
const app = express();
app.use(express.json());
app.use('/habilitados', habilitadosRouter);

// ─── Validación de entrada ───────────────────────────────────────────────────

test('2.1: 400 si falta el campo aprobados', async () => {
  const res = await request(app).post('/habilitados').send({});

  expect(res.status).toBe(400);
  expect(res.body).toHaveProperty('error');
});

test('2.2: 400 si aprobados es un string', async () => {
  const res = await request(app)
    .post('/habilitados')
    .send({ aprobados: '1INF25' });

  expect(res.status).toBe(400);
  expect(res.body).toHaveProperty('error');
  // No debe devolver un array de resultados
  expect(Array.isArray(res.body)).toBe(false);
});

test('2.3: 400 si algún elemento no es string', async () => {
  // número y null
  const r1 = await request(app)
    .post('/habilitados')
    .send({ aprobados: [1, null] });
  expect(r1.status).toBe(400);
  expect(r1.body).toHaveProperty('error');

  // boolean
  const r2 = await request(app)
    .post('/habilitados')
    .send({ aprobados: [true] });
  expect(r2.status).toBe(400);
  expect(r2.body).toHaveProperty('error');

  // objeto
  const r3 = await request(app)
    .post('/habilitados')
    .send({ aprobados: [{}] });
  expect(r3.status).toBe(400);
  expect(r3.body).toHaveProperty('error');
});

test('4.1: 400 si un código no cumple el formato', async () => {
  // XSS-like
  const r1 = await request(app)
    .post('/habilitados')
    .send({ aprobados: ['1INF30<script>'] });
  expect(r1.status).toBe(400);
  expect(r1.body).toHaveProperty('error');

  // minúsculas
  const r2 = await request(app)
    .post('/habilitados')
    .send({ aprobados: ['1inf25'] });
  expect(r2.status).toBe(400);
  expect(r2.body).toHaveProperty('error');

  // 5 caracteres
  const r3 = await request(app)
    .post('/habilitados')
    .send({ aprobados: ['1INF2'] });
  expect(r3.status).toBe(400);
  expect(r3.body).toHaveProperty('error');

  // 7 caracteres
  const r4 = await request(app)
    .post('/habilitados')
    .send({ aprobados: ['1INF250'] });
  expect(r4.status).toBe(400);
  expect(r4.body).toHaveProperty('error');
});

// ─── Límite de tamaño ────────────────────────────────────────────────────────

test('3.1: 400 con 151 códigos válidos, 200 con 150', async () => {
  // Genera n códigos válidos con formato ^[A-Z0-9]{6}$
  const genCodigos = (n) =>
    Array.from({ length: n }, (_, i) => {
      const num = String(i).padStart(5, '0');
      return `A${num}`;
    });

  const codigos151 = genCodigos(151);
  const r1 = await request(app).post('/habilitados').send({ aprobados: codigos151 });
  expect(r1.status).toBe(400);
  expect(r1.body).toHaveProperty('error');

  const codigos150 = genCodigos(150);
  const r2 = await request(app).post('/habilitados').send({ aprobados: codigos150 });
  expect(r2.status).toBe(200);
  expect(Array.isArray(r2.body)).toBe(true);
});

test('3.2: 200 en menos de 1 segundo con 150 códigos', async () => {
  const codigos150 = Array.from({ length: 150 }, (_, i) => {
    const num = String(i).padStart(5, '0');
    return `A${num}`;
  });

  const inicio = Date.now();
  const res = await request(app).post('/habilitados').send({ aprobados: codigos150 });
  const duracion = Date.now() - inicio;

  expect(res.status).toBe(200);
  expect(duracion).toBeLessThan(1000);
});

// ─── Integración con la app real (router montado en src/app.js) ──────────────

const appReal = require('../src/app');

test('1.1: 27 cursos habilitados con ["1INF25","1INF27","1INF49"]', async () => {
  const res = await request(appReal)
    .post('/habilitados')
    .send({ aprobados: ['1INF25', '1INF27', '1INF49'] });

  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  expect(res.body).toHaveLength(27);

  const ids = res.body.map((c) => c.id);
  expect(ids).toContain('1INF29');
  expect(ids).toContain('1INF30');
  expect(ids).toContain('1INF31');
  expect(ids).toContain('1INF32');

  res.body.forEach((curso) => {
    expect(curso).toHaveProperty('id');
    expect(curso).toHaveProperty('name');
  });
});

test('1.5: con 6 aprobados incluye 1CON27 y 1INF29-1INF32, no incluye 1INF34', async () => {
  const res = await request(appReal)
    .post('/habilitados')
    .send({ aprobados: ['1INF25', '1INF27', '1INF49', '1IND90', '1INF28', '1INF33'] });

  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);

  const ids = res.body.map((c) => c.id);
  expect(ids).toContain('1CON27');
  expect(ids).toContain('1INF29');
  expect(ids).toContain('1INF30');
  expect(ids).toContain('1INF31');
  expect(ids).toContain('1INF32');

  expect(ids).not.toContain('1INF34');
});

test('2.4: lista vacía devuelve solo cursos sin requisitos', async () => {
  const res = await request(appReal)
    .post('/habilitados')
    .send({ aprobados: [] });

  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);

  res.body.forEach((curso) => {
    expect(curso.prerequisites.length).toBe(0);
  });
});

// ─── Manejo seguro de errores (requisito 4.2 y 4.3) ──────────────────────────

const repositorio = require('../src/data/repositorio');

test('4.2: 400 con cuerpo no JSON', async () => {
  const res = await request(appReal)
    .post('/habilitados')
    .set('Content-Type', 'application/json')
    .send('no json');

  expect(res.status).toBe(400);
  expect(res.body).toHaveProperty('error');
  expect(res.body).not.toEqual({ error: 'error interno del servidor' });
});

describe('4.3: 500 ante error interno', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('500 con cuerpo exacto y sin stack trace', async () => {
    jest
      .spyOn(repositorio, 'listarHabilitados')
      .mockImplementation(() => {
        throw new Error('boom en /t/ruta/secreta/src/app.js');
      });

    const res = await request(appReal)
      .post('/habilitados')
      .send({ aprobados: ['1INF25'] });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'error interno del servidor' });

    const cuerpo = JSON.stringify(res.body);
    expect(cuerpo).not.toContain('at ');
    expect(cuerpo).not.toContain('/t/');
    expect(cuerpo).not.toContain('stack');
  });
});
