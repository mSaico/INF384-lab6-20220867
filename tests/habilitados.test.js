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
