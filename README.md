# Escala Nexus

# BUILD 0 — Fundación, identidad y esqueleto
Vas a construir **ESCALA Nexus**, un sistema de gestión de talento para Escala, firma mexicana de Administración Profesional de Proyectos de Construcción y Asset Management, con sede corporativa en Valle Oriente, San Pedro Garza García, Nuevo León. Actúa como el equipo de producto y diseño de un estudio que construye software interno de alta gama. Todo lo que construyas debe sentirse hecho para esta empresa y para nadie más. Puedes utilizar software como Buk, Factorial, Sesame HR, etc; solo como apoyo visual y guía para entender el concepto, tomando en cuenta lo bueno y siendo mejores que ellos en lo malo.

## 0.1 Contexto que debe permear cada decisión
Escala no construye: dirige proyectos de construcción de otros. Vende **predictibilidad**. En un país donde 9 de cada 10 obras se desvían en tiempo y costo, la promesa comercial de Escala es que las suyas no. Su metodología propia (ESCALA APP) sigue estándares PMI e incorpora Lean Construction, Pull Planning, BIM, PMWeb y valor ganado.

Población:
- **40% corporativo** — Dirección, PMO, Oficina de Administración de Proyectos, especialistas en MEP, Costos, Lean y BIM. Perfil de escritorio.
- **60% campo** — Directores de Proyecto, coordinadores de obra, Punch List Coordinators, dispersos a nivel nacional. Ya usan AutoCAD, Autodesk Construction Cloud y MS Project en móvil. No son un perfil reacio a la tecnología: necesitan velocidad, no simplificación condescendiente.

Dolor: la calificación interna más baja de la firma es **"Administración Interna: 3.7 / 5.0"**, por procesos estructurados y lentos. A su vez la empresa paga licencias fragmentadas y caras de software que casi nadie usa.

**La tesis del sistema, y debe notarse en la interfaz:** Escala le aplica a sus proyectos un rigor que no le aplica a las personas que ejecutan esos proyectos. Hay control paramétrico de presupuesto pero no de rotación. Hay valor ganado en la obra pero no en el talento. Nexus administra el talento con la misma metodología con la que Escala administra proyectos.

## 0.2 Principios no negociables
1. **Conectar antes que administrar.** El sistema debe sentirse como apoyo al colaborador, no como vigilancia. Cada pantalla dirigida al colaborador responde primero "¿qué gano yo?" antes de pedirle datos.
2. **Cero burocracia neta.** Cada función que agregues debe eliminar un paso existente. Si una función no quita un clic o una firma, no entra.
3. **Todo número es auditable.** Ningún indicador aparece sin fórmula visible, fuente y fecha de corte. Esto no es un detalle: el sistema será cuestionado por el área de Contabilidad y debe poder defenderse solo.
4. **Móvil primero para campo, denso para corporativo.** No una versión reducida: dos experiencias del mismo sistema.
5. **Permisos granulares desde el primer commit**, no como parche.
6. **Cumplimiento incorporado al diseño** (Ley Federal del Trabajo, LFPDPPP, NOM-035), con los puntos que requieren visto bueno de Jurídico marcados visiblemente en la propia interfaz.

## 0.3 Stack
- React + TypeScript + Tailwind + shadcn/ui
- Supabase: Postgres, Auth (email + Google SSO), Row Level Security, Storage, Edge Functions
- Recharts para gráficas
- date-fns con locale español
- PWA instalable (manifest + service worker), responsiva desde 360px
- Todo el texto de interfaz en **español de México**. Sin anglicismos innecesarios: "colaborador" no "employee", "vacante" no "job posting", "desempeño" no "performance".

## 0.4 Sistema de diseño
Escala vive de instrumentos de medición: plomadas, niveles, cotas, líneas base, curvas de valor ganado. El sistema visual sale de ahí.

**Paleta** (defínela como variables CSS y tokens de Tailwind):

| Token | Hex | Uso |

|---|---|---|

| `grafito` | `#12161C` | Texto principal, encabezados de tabla, fondo del Modo Consejo |

| `plomada` | `#17395B` | Color primario: navegación activa, botones principales |

| `cal` | `#F4F5F2` | Fondo de aplicación |

| `cota` | `#7E8794` | Texto secundario, reglas, etiquetas |

| `casco` | `#E2A33C` | Acento cálido: bienestar, reconocimientos, hitos |

| `desviacion` | `#C24B3A` | Fuera de línea base, alertas, vencido |

| `linea` | `#2F7A6B` | Dentro de línea base, aprobado, completado |

El acento cálido `casco` se concentra en el módulo de Bienestar y en reconocimientos. En el resto del sistema aparece solo como marcador de hito. No conviertas todo en ámbar.

**Tipografía** (Google Fonts):

- Display / encabezados: **Archivo**, pesos 600–700, tracking ligeramente cerrado

- Cuerpo: **IBM Plex Sans**, 400–500

- Datos, cifras, códigos, KPIs, folios: **IBM Plex Mono**, 500

Toda cifra en el sistema —montos, días, porcentajes, folios, fechas en tablas— se compone en IBM Plex Mono con numerales tabulares. Los números deben leerse como instrumentación, no como texto.

**Elemento firma: la Banda de Línea Base.**

Es el componente que hace reconocible a Nexus y debe aparecer en todo indicador del sistema. Consiste en una regla horizontal delgada que representa el rango del indicador, con:

- una marca vertical fija en la posición de la **línea base o meta**, etiquetada;

- un marcador sólido en la posición del **valor real**;

- el tramo entre ambos coloreado en `linea` si el real cumple o supera la meta, en `desviacion` si no;

- la magnitud de la desviación en IBM Plex Mono junto a la banda, con signo.

Constrúyelo como componente reutilizable `<BandaLineaBase />` con props: `valor`, `meta`, `min`, `max`, `unidad`, `sentido` ('mayorEsMejor' | 'menorEsMejor'), `etiquetaMeta`. Nunca muestres un KPI como un número suelto en una tarjeta: siempre número + banda. Es la traducción literal del valor ganado de obra al lenguaje de talento, y es la razón por la que la Dirección lo va a entender sin que nadie se los explique.

**Reglas de composición:**

- Radios de esquina de 4px máximo. Nada redondeado ni suave: es un instrumento técnico.
- Divisores de 1px en `cota` al 20%. Sin sombras salvo en menús flotantes y modales.
- Densidad alta en corporativo: filas de tabla de 40px, tipografía de 13–14px.
- Densidad baja en campo: objetivos táctiles mínimos de 48px, tipografía de 16px, alto contraste (uso con guantes y bajo sol directo).
- Animación mínima y funcional: transiciones de 150ms, respeta `prefers-reduced-motion`. Nada de partículas, degradados animados ni efectos ambientales.

**Voz de la interfaz:**
- Verbos activos y en primera persona del sistema. El botón dice "Enviar solicitud" y el aviso resultante dice "Solicitud enviada". Mismo nombre en todo el flujo.
- Estados vacíos que invitan a actuar, no que se disculpan: "Aún no hay candidatos en esta fase. Agrega el primero." Nunca "No se encontraron resultados."
- Errores que dicen qué pasó y cómo se arregla, sin pedir perdón.
- Nada de lenguaje corporativo hueco. El colaborador de obra que abre esto con guantes puestos no necesita que le hablen de sinergias.

## 0.5 Roles y permisos
Crea el enum `rol_usuario` y aplícalo con Row Level Security en cada tabla:

| Rol | Alcance |

|---|---|

| `direccion_talento` | Acceso total. Es el usuario principal del sistema. |

| `direccion_general` | Lectura total agregada + Modo Consejo. Sin edición de expedientes. |

| `lider_proyecto` | Su equipo directo únicamente: solicitudes, evaluaciones, agendas de desarrollo, bienestar agregado de su obra. |

| `reclutamiento` | Módulo de Atracción completo. Sin acceso a compensación ni evaluaciones. |

| `colaborador` | Su propio expediente, sus solicitudes, su agenda de desarrollo, su histórico de bienestar. |

| `finanzas_auditoria` | **Solo lectura** del Panel de Valor Ganado del Talento y del registro de supuestos. Sin acceso a datos personales identificables. |

| `ti_sistema` | Configuración, integraciones, bitácora de auditoría. Sin acceso a contenido de evaluaciones ni bienestar. |

El rol `finanzas_auditoria` es deliberado: le abre la puerta a Contabilidad para verificar los números en vez de discutirlos por correo. Diséñalo como una experiencia de primera clase, no como un permiso castigado.

## 0.6 Modelo de datos

Crea estas tablas en Supabase con RLS activo, `created_at`, `updated_at` y `creado_por` en todas:

**Núcleo**

- `colaboradores` — nombre, correo, fecha_ingreso, puesto_id, area, ubicacion (corporativo|campo), proyecto_actual_id, lider_id, estatus, foto_url, tipo_contrato

- `puestos` — nombre, familia, nivel_organizacional, area, perfil_competencias (jsonb con nivel meta por competencia)

- `proyectos` — nombre, cliente, ciudad, fecha_inicio, fecha_fin_plan, estatus, director_id, id_externo_acc

- `documentos` — colaborador_id, tipo, url, vigencia, confidencial (bool)

- `certificaciones` — colaborador_id, nombre, organismo, folio, fecha_obtencion, fecha_vencimiento, costo, patrocinada_por_escala (bool)

**Atracción**

- `vacantes` — puesto_id, proyecto_id, estatus, fecha_apertura, fecha_meta_cobertura, fecha_cierre_real, salario_min, salario_max, hiring_manager_id, motivo (nueva|reemplazo), costo_vacante_dia

- `candidatos` — nombre, correo, telefono, fuente, cv_url, vacante_id, fase_id, fecha_ingreso_fase, estatus, motivo_descarte

- `fases_proceso` — nombre, orden, sla_dias, tipo, activa

- `movimientos_candidato` — candidato_id, fase_origen, fase_destino, fecha, dias_en_fase, usuario_id

- `entrevistas` — candidato_id, entrevistador_id, tipo, fecha, estatus, notas

- `scorecards` — entrevista_id, competencia_id, calificacion (1-5), evidencia_star, recomendacion

- `ofertas` — candidato_id, sueldo, prestaciones, fecha_envio, fecha_respuesta, estatus

**Desempeño y desarrollo**

- `competencias` — grupo, nombre, descripcion, orden

- `niveles_competencia` — competencia_id, nivel (1-5), etiqueta, descripcion, resumen

- `comportamientos` — nivel_competencia_id, texto, orden

- `ciclos_evaluacion` — nombre, tipo (180|360|objetivos|calibracion), fecha_inicio, fecha_fin, estatus

- `evaluaciones` — ciclo_id, colaborador_id, evaluador_id, relacion (auto|jefe|par|colaborador|cliente), estatus

- `evaluacion_competencias` — evaluacion_id, competencia_id, nivel_observado, evidencia

- `objetivos` — colaborador_id, ciclo_id, descripcion, tipo (negocio|proyecto|esg|talento), peso, meta, real, unidad, estatus

- `mapeo_talento` — colaborador_id, ciclo_id, eje_desempeño (1-3), eje_potencial (1-3), casilla_9box, acuerdos, riesgo_salida (bajo|medio|alto), criticidad_puesto

- `agendas_desarrollo` — colaborador_id, ciclo, estatus, fecha_autorizacion, autorizada_por, avance_pct

- `autorreflexion` — agenda_id, formacion (jsonb), movilidad (jsonb), expectativas_carrera (jsonb), fortalezas (array), areas_oportunidad (array), necesidades_actual (array), necesidades_futuro (array)

- `prioridades_desarrollo` — agenda_id, dimension (saber|hacer|ser), competencia_id (nullable), descripcion, nivel_actual, nivel_meta

- `acciones_desarrollo` — prioridad_id, descripcion, via_aprendizaje (explora|conecta|participa|practica), tipo_accion, monto_inversion, medicion_exito, fecha_inicio, fecha_fin, estatus, ultima_actualizacion, observaciones

- `medicion_efectividad` — prioridad_id, comportamiento_id, autoevaluacion (bool), evaluacion_jefe (bool), comentarios, fecha

- `sesiones_seguimiento` — agenda_id, fecha, tipo, acuerdos, participantes

**Tiempo y compromisos**

- `solicitudes` — colaborador_id, tipo (vacaciones|permiso_goce|permiso_sin_goce|home_office|tiempo_por_tiempo|incapacidad), fecha_inicio, fecha_fin, dias, motivo, estatus, aprobador_id, fecha_solicitud, fecha_resolucion, horas_ciclo

- `saldos_vacaciones` — colaborador_id, año_servicio, dias_ley, dias_adicionales, dias_tomados, dias_disponibles

- `registros_jornada` — colaborador_id, fecha, tipo_registro, proyecto_id, geo_lat, geo_lng, precision_m, origen

**Bienestar y cultura**

- `pulsos_animo` — colaborador_id, fecha, valor (1-5), comentario_opcional, proyecto_id

- `encuestas` — nombre, tipo (clima|nom035|pulso|enps), fecha_inicio, fecha_fin, cobertura_objetivo

- `respuestas_encuesta` — encuesta_id, colaborador_id (hasheado), reactivo_id, valor

- `reconocimientos` — de_id, para_id, valor_asociado, mensaje, fecha, publico (bool)

- `comunicados` — titulo, cuerpo, audiencia, fecha_publicacion, autor_id, lecturas

**Analítica y gobierno**

- `supuestos_financieros` — clave, descripcion, valor, unidad, fuente, fecha_actualizacion, actualizado_por

- `kpis` — clave, nombre, formula_texto, unidad, sentido, meta, linea_base, fecha_corte

- `mediciones_kpi` — kpi_id, periodo, valor, calculado_en

- `eventos` — tipo, entidad, entidad_id, payload jsonb, procesado (bool), fecha

- `ai_runs` — tarea, entrada, salida, modelo, tokens, usuario_id, aprobado_por, estatus

- `bitacora_auditoria` — usuario_id, accion, tabla, registro_id, antes jsonb, despues jsonb, fecha

## 0.7 Navegación — esqueleto completo

Barra lateral izquierda fija en escritorio, navegación inferior de cinco elementos en móvil. Todos estos módulos existen y se navegan desde el BUILD 0. Los que aún no tienen funcionalidad muestran una pantalla de estado con el nombre del módulo, una descripción de una línea de lo que hará y la etiqueta **"En construcción — Fase 2"**. No pongas texto de relleno ni gráficas falsas en esos módulos.

1. **Tablero** — inicio, distinto según rol
2. **Atracción** — vacantes, pipeline de candidatos, entrevistas, ofertas *(profundo, BUILD 1)*
3. **Colaboradores** — directorio, expedientes, certificaciones *(funcional básico, BUILD 0)*
4. **Desempeño** — evaluaciones, modelo de liderazgo, mapeo de talento *(profundo, BUILD 2)*
5. **Desarrollo** — agendas de desarrollo, biblioteca de acciones, seguimiento *(profundo, BUILD 3)*
6. **Tiempo** — solicitudes, saldos, cobertura de obra *(funcional, BUILD 4)*
7. **Bienestar** — pulso de ánimo, reconocimientos, encuestas *(funcional básico, BUILD 5)*
8. **Comunicación** — comunicados, cumpleaños, eventos *(esqueleto)*
9. **Seguridad e Higiene** — reportes de condición insegura, verificación de EPP *(esqueleto)*
10. **Analítica** — Panel Directivo, Valor Ganado del Talento, Modo Consejo *(profundo, BUILD 6)*
11. **Configuración** — catálogos, supuestos, integraciones, permisos, bitácora

Encabezado superior: buscador global (colaboradores, candidatos, vacantes, proyectos), selector de periodo, notificaciones, avatar.

## 0.8 Qué debe funcionar al terminar el BUILD 0

- Autenticación con los siete roles y RLS aplicado de verdad, verificable iniciando sesión con cada uno.
- Módulo de Colaboradores completo: directorio con búsqueda y filtros por área, ubicación y proyecto; ficha de colaborador con datos, documentos, certificaciones y ubicación actual; alta, edición y baja.

- Esqueleto navegable de los once módulos.

- Componente `<BandaLineaBase />` construido y demostrado en el Tablero con tres indicadores reales del módulo de Colaboradores (plantilla actual vs. plantilla autorizada, antigüedad promedio, % de certificaciones vigentes).
- Datos semilla: **35 colaboradores ficticios** distribuidos 40% corporativo / 60% campo, con nombres claramente ficticios, repartidos en 6 proyectos. Todo registro semilla marcado con `es_demo = true` y una franja discreta en la interfaz que diga "Datos de demostración" mientras existan. **No inventes cifras reales de Escala en ningún indicador**: los valores de la tabla `supuestos_financieros` se cargan en blanco con la etiqueta `[Dato Requerido de Escala]` hasta que un usuario los capture.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/47718c61-4915-4b35-8b99-6103510621a6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
