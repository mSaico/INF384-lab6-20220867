const request = require('supertest');
const app = require('../src/app');

describe('GET /cursos', () => {
  // Criterio 1.1 — devuelve todos los cursos con los campos requeridos
  test('1.1 responde 200 con todos los cursos', async () => {
    const res = await request(app).get('/cursos');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    // Verifica que cada curso tenga los campos del contrato
    for (const curso of res.body) {
      expect(curso).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          credits: expect.any(Number),
          type: expect.stringMatching(/^(obligatorio|electivo)$/),
        }),
      );
    }
  });

  // Criterio 1.2 — filtra por ciclo
  test('1.2 filtra correctamente por ciclo', async () => {
    const res = await request(app).get('/cursos?ciclo=10');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(3);
    expect(res.body.every((c) => c.cycle === 10)).toBe(true);
  });

  test('1.2 ciclo 5 devuelve solo cursos del ciclo 5', async () => {
    const res = await request(app).get('/cursos?ciclo=5');

    expect(res.status).toBe(200);
    expect(res.body.every((c) => c.cycle === 5)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  // Criterio 1.3 — ciclo inválido → 400
  test('1.3 responde 400 cuando ciclo no es entero entre 5 y 10', async () => {
    const res = await request(app).get('/cursos?ciclo=4');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'ciclo debe ser un entero entre 5 y 10',
    });
  });

  test('1.3 responde 400 para ciclo=11', async () => {
    const res = await request(app).get('/cursos?ciclo=11');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ciclo debe ser un entero entre 5 y 10');
  });

  test('1.3 responde 400 para ciclo=abc', async () => {
    const res = await request(app).get('/cursos?ciclo=abc');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ciclo debe ser un entero entre 5 y 10');
  });

  test('1.3 responde 400 para ciclo decimal (5.5)', async () => {
    const res = await request(app).get('/cursos?ciclo=5.5');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ciclo debe ser un entero entre 5 y 10');
  });
});

describe('GET /cursos/:codigo', () => {
  // Criterio 2.1 — código existente con requisitos resueltos
  test('2.1 devuelve el curso con sus requisitos resueltos', async () => {
    const res = await request(app).get('/cursos/1INF30');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: '1INF30',
      name: 'Programación 3',
      credits: 5.0,
      cycle: 6,
      type: 'obligatorio',
    });
    expect(Array.isArray(res.body.prerequisites)).toBe(true);
    expect(res.body.prerequisites).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: '1INF25', name: 'Programación 2' }),
      ]),
    );
  });

  test('2.1 un curso sin requisitos devuelve prerequisites vacío', async () => {
    // 1GES92 no tiene prerequisites según el JSON
    const res = await request(app).get('/cursos/1GES92');

    expect(res.status).toBe(200);
    expect(res.body.prerequisites).toEqual([]);
  });

  // Criterio 2.2 — código inexistente → 404
  test('2.2 responde 404 para un código inexistente', async () => {
    const res = await request(app).get('/cursos/XXX999');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'curso no encontrado' });
  });
});
