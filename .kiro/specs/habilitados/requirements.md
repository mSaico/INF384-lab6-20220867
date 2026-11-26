# Requirements Document

## Introduction

Funcionalidad para consultar los cursos habilitados para matrícula a partir de la lista de cursos aprobados por el alumno. El endpoint `POST /habilitados` recibe un array de códigos de cursos aprobados y devuelve los cursos no aprobados cuyos requisitos están todos incluidos en la lista de aprobados. Un curso sin requisitos también está habilitado. Los cursos se leen de `data/cursos.json`, que contiene 87 cursos con estructura `{ id, name, credits, cycle, type, prerequisites: [id, ...] }`.

## Glossary

- **Sistema**: Servicio Express/Node.js que expone la API de cursos.
- **Curso aprobado**: Curso cuyo código figura en la lista `aprobados` de la solicitud.
- **Curso habilitado**: Curso no aprobado cuyos requisitos están todos incluidos en la lista `aprobados`; un curso sin requisitos siempre está habilitado.
- **Código de curso**: Identificador del curso, por ejemplo `1INF25`.

## Requirements

### Requisito 1: Cursos habilitados

**Historia de usuario:** Como alumno, quiero saber qué cursos puedo llevar este ciclo, para matricularme solo en cursos habilitados.

#### Criterios de aceptación

1.1 CUANDO se envíe `POST /habilitados` con `{"aprobados": ["1INF25","1INF27","1INF49"]}`, EL sistema DEBE responder 200 con un array de 27 cursos, incluyendo 1INF29, 1INF30, 1INF31 y 1INF32, donde cada curso tiene al menos los campos `id` y `name`.

1.2 CUANDO se envíe una lista de aprobados válida, EL sistema DEBE responder 200 con un array donde ningún curso de la lista de aprobados aparece en la respuesta.

1.3 CUANDO se envíe una lista de aprobados válida, EL sistema DEBE responder 200 con un array donde ningún curso tiene un requisito no incluido en la lista de aprobados.

1.4 CUANDO se envíe una lista de aprobados válida que no incluye cursos sin requisitos, EL sistema DEBE responder 200 con un array que incluye todos los cursos sin requisitos.

1.5 CUANDO se envíe `{"aprobados": ["1INF25","1INF27","1INF49","1IND90","1INF28","1INF33"]}`, EL sistema DEBE responder 200 con un array que incluye 1CON27, 1INF29, 1INF30, 1INF31 y 1INF32, y que no incluye 1INF34 porque su requisito 1CON27 no figura en la lista de aprobados.

### Requisito 2: Validación de entrada

**Historia de usuario:** Como alumno, quiero recibir un error claro cuando envío datos inválidos, para corregir mi solicitud.

#### Criterios de aceptación

2.1 SI el cuerpo de la solicitud no incluye el campo `aprobados`, ENTONCES EL sistema DEBE responder 400 con un mensaje de error en el campo `error` del cuerpo JSON.

2.2 SI `aprobados` es un string (por ejemplo `{"aprobados": "1INF25"}`), ENTONCES EL sistema DEBE responder 400 con un mensaje de error, sin calcular ni devolver resultados.

2.3 SI `aprobados` es un array que contiene elementos que no son strings (por ejemplo `[1, null]`), ENTONCES EL sistema DEBE responder 400 con un mensaje de error.

2.4 CUANDO se envíe `{"aprobados": []}`, EL sistema DEBE responder 200 con todos los cursos sin requisitos y ningún curso con requisitos.

### Requisito 3: Límite de tamaño de la lista

**Historia de usuario:** Como administrador del servicio, quiero un límite en el tamaño de la lista de aprobados, para evitar que solicitudes masivas dejen el servicio sin responder.

#### Criterios de aceptación

3.1 SI la lista `aprobados` contiene más de 150 elementos, ENTONCES EL sistema DEBE responder 400 con un mensaje en el campo `error`.

3.2 CUANDO se envíe una lista válida de 150 códigos, EL sistema DEBE responder 200 en menos de 1 segundo.

### Requisito 4: Manejo seguro de entradas inválidas y errores

**Historia de usuario:** Como administrador del servicio, quiero que entradas maliciosas no expongan información interna, para proteger el servidor.

#### Criterios de aceptación

4.1 SI algún elemento de `aprobados` no cumple el formato de código de curso (6 caracteres en mayúscula o dígitos, `^[A-Z0-9]{6}$`, por ejemplo `1INF30<script>`), ENTONCES EL sistema DEBE responder 400 con un mensaje en el campo `error`.

4.2 SI el cuerpo de la solicitud no es JSON válido, ENTONCES EL sistema DEBE responder 400 con un mensaje en el campo `error`.

4.3 SI ocurre un error interno no controlado, ENTONCES EL sistema DEBE responder 500 con el cuerpo exacto `{"error": "error interno del servidor"}`, sin stack trace ni rutas de archivos.

### Requisito 5: Calidad y seguridad del pipeline

**Historia de usuario:** Como responsable de TI, quiero que el pipeline haga cumplir la política, para que ningún cambio que llegue a main la incumpla.

#### Criterios de aceptación

5.1 SI la cobertura de líneas de las pruebas es menor a 80 %, ENTONCES EL pipeline DEBE fallar.

5.2 SI `npm audit` reporta al menos una vulnerabilidad de severidad alta o crítica en cualquier dependencia (incluidas las de desarrollo), ENTONCES EL pipeline DEBE fallar.

5.3 SI gitleaks detecta un secreto en el historial del repositorio, ENTONCES EL pipeline DEBE fallar.
