# Implementation Plan: Cursos habilitados

## Overview

Se añade el endpoint `POST /habilitados` a la API Express existente: valida el cuerpo (`aprobados` como array de strings con formato `^[A-Z0-9]{6}$`, máximo 150 elementos), construye un `Set` de aprobados y delega a una nueva función `listarHabilitados(aprobadosSet)` del repositorio en memoria. Cada tarea termina con su propia suite de tests (un test por criterio de aceptación, con el número del criterio en el nombre), de modo que cada paso queda verificable de forma independiente. La última tarea (gates de CI) es manual: la ejecutará el usuario.

## Tasks

- [ ] 1. Implementar `listarHabilitados` en el repositorio
  - [ ] 1.1 Añadir `listarHabilitados(aprobadosSet)` en `src/data/repositorio.js`
    - Recorrer `listar()` y devolver los cursos `c` tales que `!aprobadosSet.has(c.id)` y `c.prerequisites.every((pr) => aprobadosSet.has(pr))`
    - Los cursos sin requisitos (`prerequisites: []`) quedan habilitados mientras no estén aprobados (decisión a del diseño)
    - Mantener el orden de `listar()` (decisión e del diseño)
    - Exportar `listarHabilitados` en `module.exports`
    - _Requisitos: 1.2, 1.3, 1.4_

  - [ ] 1.2 Escribir tests unitarios del repositorio en `tests/habilitados.repositorio.test.js`
    - `test('1.2: ningún curso aprobado aparece en el resultado')` — con un Set de aprobados de la malla, verificar que ningún id del resultado está en el Set
    - `test('1.3: ningún curso del resultado tiene un requisito fuera de los aprobados')` — verificar `c.prerequisites.every((pr) => aprobadosSet.has(pr))` para cada curso devuelto
    - `test('1.4: todos los cursos sin requisitos no aprobados están incluidos')` — con un Set que no contiene cursos sin requisitos, el resultado incluye todos los `prerequisites.length === 0`
    - Los tests leen `data/cursos.json` directamente como modelo de referencia
    - _Requisitos: 1.2, 1.3, 1.4_

- [ ] 2. Implementar el router `POST /habilitados` con validación de entrada
  - [ ] 2.1 Crear `src/routes/habilitados.js`
    - Router Express (`express.Router()`) con `router.post('/', ...)`
    - Validar en orden: presencia del campo `aprobados` (400, `"el campo aprobados es obligatorio"`), tipo array (400, `"aprobados debe ser un array de strings"`), todos los elementos string (400, mismo mensaje), formato `^[A-Z0-9]{6}$` por elemento (400, `"código de curso inválido"`)
    - Con la entrada válida: construir `new Set(aprobados)` (decisiones b, c, d del diseño), llamar `repositorio.listarHabilitados(set)` y responder 200 con el array completo de objetos de curso (decisión f)
    - _Requisitos: 2.1, 2.2, 2.3, 4.1_

  - [ ] 2.2 Escribir tests de validación en `tests/habilitados.test.js` (supertest sobre `src/app.js`)
    - `test('2.1: 400 si falta el campo aprobados')` — POST con cuerpo `{}` → 400 con `error`
    - `test('2.2: 400 si aprobados es un string')` — POST con `{"aprobados": "1INF25"}` → 400, sin resultados
    - `test('2.3: 400 si algún elemento no es string')` — POST con `{"aprobados": [1, null]}` y variantes (boolean, objeto) → 400
    - `test('4.1: 400 si un código no cumple el formato')` — POST con `"1INF30<script>"`, `"1inf25"`, longitudes 5 y 7 → 400 con `error`
    - _Requisitos: 2.1, 2.2, 2.3, 4.1_

- [ ] 3. Límite de 150 elementos
  - [ ] 3.1 Añadir la validación de tamaño al router `src/routes/habilitados.js`
    - Después de validar el formato, si `aprobados.length > 150` responder 400 con `"la lista no puede tener más de 150 elementos"` (el chequeo se aplica sobre el array original, decisión b del diseño)
    - _Requisitos: 3.1, 3.2_

  - [ ] 3.2 Escribir tests del límite en `tests/habilitados.test.js`
    - `test('3.1: 400 con 151 códigos válidos, 200 con 150')` — generar 151 y 150 códigos válidos (`1INF25` con variaciones de dígito) y verificar 400/200 respectivamente
    - `test('3.2: 200 en menos de 1 segundo con 150 códigos')` — medir el tiempo de respuesta del POST con 150 códigos válidos y verificar que sea < 1000 ms
    - _Requisitos: 3.1, 3.2_

- [ ] 4. Montar el router en `src/app.js`
  - [ ] 4.1 Montar el router en la app
    - En `src/app.js`, añadir `app.use('/habilitados', require('./routes/habilitados'));` después del router de `/cursos` y antes del middleware de error global (no duplicarlo)
    - _Requisitos: 1.1, 1.5, 2.4_

  - [ ] 4.2 Escribir tests de integración de la malla real en `tests/habilitados.test.js`
    - `test('1.1: 27 cursos habilitados con 1INF25, 1INF27 y 1INF49')` — POST con `{"aprobados": ["1INF25","1INF27","1INF49"]}` → 200, 27 cursos, incluye 1INF29, 1INF30, 1INF31 y 1INF32, cada objeto con `id` y `name`
    - `test('1.5: habilitados con 6 aprobados incluyen 1CON27 y 1INF29-1INF32, no 1INF34')` — POST con `{"aprobados": ["1INF25","1INF27","1INF49","1IND90","1INF28","1INF33"]}` → incluye 1CON27, 1INF29, 1INF30, 1INF31 y 1INF32; no incluye 1INF34
    - `test('2.4: lista vacía devuelve solo cursos sin requisitos')` — POST con `{"aprobados": []}` → 200 con todos los cursos sin requisitos y ningún curso con requisitos
    - _Requisitos: 1.1, 1.5, 2.4_

- [ ] 5. Manejo seguro de errores del endpoint
  - [ ] 5.1 Ajustar el error handler de `express.json()` en `src/app.js`
    - Capturar el error de parseo de JSON antes del middleware global y responder 400 con `{ "error": "cuerpo JSON inválido" }` en lugar del 500 genérico
    - _Requisitos: 4.2_

  - [ ] 5.2 Escribir tests de errores en `tests/habilitados.test.js`
    - `test('4.2: 400 con cuerpo no JSON')` — POST con `set('Content-Type','application/json').send('no json')` → 400 con `error`
    - `test('4.3: 500 con cuerpo exacto ante error interno')` — stub de `repositorio.listarHabilitados` con `jest.spyOn`/`jest.mock` que lanza una excepción → 500 con el cuerpo exacto `{"error": "error interno del servidor"}`, sin stack trace ni rutas
    - Restaurar el stub después del test (`afterEach`)
    - _Requisitos: 4.2, 4.3_

- [ ] 6. Escribir tests de propiedades (PBT)
  - [ ] 6.1 Property 1: equivalencia con el modelo de referencia
    - En `tests/habilitados.prop.test.js`, generar 100 subconjuntos aleatorios de códigos de `data/cursos.json` con PRNG semillado (`Math.random` con seed fija o un LCG propio), POST a cada uno y comparar contra el modelo de referencia calculado en el test (cursos no aprobados con todos los requisitos en la lista)
    - **Property 1: Equivalencia con el modelo de referencia**
    - **Valida: Requisitos 1.2, 1.3, 1.4, 2.4**
    - _Requisitos: 1.2, 1.3, 1.4, 2.4_

  - [ ] 6.2 Property 2: rechazo de elementos inválidos
    - Generar 100 strings inválidas (minúsculas, `<script>`, longitudes 5 y 7, caracteres especiales) con PRNG semillado, POST con cada una dentro de `aprobados` → 400 con `error`
    - **Property 2: Rechazo de elementos inválidos**
    - **Valida: Requisitos 2.1, 2.2, 2.3, 4.1**
    - _Requisitos: 2.1, 2.2, 2.3, 4.1_

  - [ ] 6.3 Property 3: rechazo por tamaño
    - Generar listas de 151-200 códigos válidos con PRNG semillado, POST → 400 con `error`
    - **Property 3: Rechazo por tamaño**
    - **Valida: Requisito 3.1**
    - _Requisitos: 3.1_

  - [ ] 6.4 Property 4: estabilidad ante reorden y duplicados
    - Para listas válidas generadas, reordenar (shuffle con PRNG semillado) y duplicar elementos (manteniendo ≤ 150) y verificar que la respuesta es idéntica a la original
    - **Property 4: Estabilidad ante reorden y duplicados**
    - **Valida: Requisitos 1.2, 1.3**
    - _Requisitos: 1.2, 1.3_

- [ ] 7. Checkpoint - Verificar la suite completa
  - Ejecutar `npm test` (o `npx jest --run`) y confirmar que todos los tests de `tests/habilitados*.test.js` y las suites existentes pasan
  - Corregir cualquier fallo antes de continuar
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Gates de calidad y seguridad en CI **([manual] - la hará el usuario a mano; no ejecutar)**
  - [ ] 8.1 Añadir `coverageThreshold` a `jest.config.js`
    - `coverageThreshold: { global: { lines: 80 } }` (criterio 5.1)
    - _Requisitos: 5.1_

  - [ ] 8.2 Actualizar `.github/workflows/ci.yml`
    - Paso de pruebas con `npx jest --run --coverage` (falla si la cobertura de líneas es < 80 %, criterio 5.1)
    - Paso `npm audit --audit-level=high` sin `--omit=dev` (falla con severidad high o critical, criterio 5.2)
    - Paso de gitleaks con `fetch-depth: 0` sobre todo el historial, umbral 0 hallazgos (criterio 5.3)
    - Mantener los triggers `pull_request` y `push` a main
    - _Requisitos: 5.1, 5.2, 5.3_

## Notes

- Las tareas 1 a 6 son implementables por el agente de código; la tarea 8 es manual y el usuario la ejecutará él mismo.
- Los tests usan supertest (ya instalado en el proyecto) y Jest; no se añaden dependencias nuevas.
- Cada test lleva el número del criterio de aceptación en su nombre para trazabilidad con `TRAZABILIDAD.md`.
- La tarea 7 es checkpoint: no se prosigue con 8 hasta que toda la suite pase.
- Los tests de propiedades (tarea 6) usan PRNG semillado para ser reproducibles, sin librerías externas.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["2.2", "3.1"] },
    { "id": 4, "tasks": ["3.2", "4.1"] },
    { "id": 5, "tasks": ["4.2", "5.1"] },
    { "id": 6, "tasks": ["5.2"] },
    { "id": 7, "tasks": ["6.1", "6.2", "6.3", "6.4"] },
    { "id": 8, "tasks": ["7"] },
    { "id": 9, "tasks": ["8.1", "8.2"] }
  ]
}
```
