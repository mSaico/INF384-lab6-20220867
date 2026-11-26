const { Router } = require('express');
const repositorio = require('../data/repositorio');

const router = Router();

const CODIGO_CURSO = /^[A-Z0-9]{6}$/;

// POST /habilitados
router.post('/', (req, res) => {
  const { aprobados } = req.body ?? {};

  // 1. Presencia del campo
  if (aprobados === undefined) {
    return res.status(400).json({ error: 'el campo aprobados es obligatorio' });
  }

  // 2. Tipo array
  if (!Array.isArray(aprobados)) {
    return res
      .status(400)
      .json({ error: 'aprobados debe ser un array de strings' });
  }

  // 3. Todos los elementos son strings
  if (!aprobados.every((el) => typeof el === 'string')) {
    return res
      .status(400)
      .json({ error: 'aprobados debe ser un array de strings' });
  }

  // 4. Formato del código de curso
  if (!aprobados.every((el) => CODIGO_CURSO.test(el))) {
    return res.status(400).json({ error: 'código de curso inválido' });
  }

  // 5. Límite de tamaño (tarea 3 aplicará el tope; aquí solo el cálculo)
  if (aprobados.length > 150) {
    return res
      .status(400)
      .json({ error: 'la lista no puede tener más de 150 elementos' });
  }

  const aprobadosSet = new Set(aprobados);
  return res.json(repositorio.listarHabilitados(aprobadosSet));
});

module.exports = router;
