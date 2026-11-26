const path = require('path');
const express = require('express');
const repositorio = require('./data/repositorio');

const app = express();

app.use(express.json());

// Error de parseo de JSON: 400 con cuerpo JSON (criterio 4.2).
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const esErrorParseo =
    (err instanceof SyntaxError && err.status === 400) ||
    err?.type === 'entity.parse.failed';
  if (esErrorParseo) {
    return res.status(400).json({ error: 'cuerpo JSON inválido' });
  }
  next(err);
});
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', cursos: repositorio.listar().length });
});

// Router de cursos montado en /cursos
app.use('/cursos', require('./routes/cursos'));

// Router de habilitados montado en /habilitados
app.use('/habilitados', require('./routes/habilitados'));

// Middleware de manejo de errores: respuesta genérica para errores no controlados.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'error interno del servidor' });
});

module.exports = app;
