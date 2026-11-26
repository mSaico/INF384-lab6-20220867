const fs = require('fs');
const path = require('path');
const repositorio = require('../src/data/repositorio');

const { courses } = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'cursos.json'), 'utf8'),
);

describe('listarHabilitados(aprobadosSet)', () => {
  // Aprobados: todos los cursos con requisitos (ninguno sin requisitos),
  // set con contenido representativo de la malla.
  const aprobados = new Set(
    courses.filter((c) => c.prerequisites.length > 0).map((c) => c.id),
  );

  test('1.2: ningún curso aprobado aparece en el resultado', () => {
    const resultado = repositorio.listarHabilitados(aprobados);
    expect(resultado.length).toBeGreaterThan(0);
    for (const curso of resultado) {
      expect(aprobados.has(curso.id)).toBe(false);
    }
  });

  test('1.3: ningún curso del resultado tiene un requisito fuera de los aprobados', () => {
    const resultado = repositorio.listarHabilitados(aprobados);
    for (const curso of resultado) {
      expect(
        curso.prerequisites.every((pr) => aprobados.has(pr)),
      ).toBe(true);
    }
  });

  test('1.4: todos los cursos sin requisitos no aprobados están incluidos', () => {
    const sinRequisitos = courses.filter((c) => c.prerequisites.length === 0);
    // El Set no contiene ningún curso sin requisitos.
    for (const c of sinRequisitos) {
      expect(aprobados.has(c.id)).toBe(false);
    }
    const resultado = repositorio.listarHabilitados(aprobados);
    const ids = new Set(resultado.map((c) => c.id));
    for (const c of sinRequisitos) {
      expect(ids.has(c.id)).toBe(true);
    }
  });
});
