
-- Modelo de liderazgo de Escala (dato real, no demo)
DELETE FROM public.comportamientos;
DELETE FROM public.niveles_competencia;
DELETE FROM public.competencias;

INSERT INTO public.competencias (grupo, nombre, descripcion, orden, es_demo) VALUES
('Estrategia','Visión Estratégica','Tiene visión de futuro que incorpora una comprensión del entorno para contribuir o diseñar estrategias que aseguran la sostenibilidad del negocio.',1,false),
('Estrategia','Toma de Decisiones','Toma decisiones acertadas que permiten implementar la estrategia y generan valor al negocio.',2,false),
('Estrategia','Pensamiento Sistémico','Analiza situaciones complejas con un enfoque holístico que considera las múltiples perspectivas, las conexiones e interrelaciones existentes en el negocio y en su entorno.',3,false),
('Gestión','Organización y Ejecución','Establece protocolos de gestión que aseguran planeación, organización y seguimiento de la ejecución y generación de resultados del negocio.',4,false),
('Gestión','Transformación','Identifica áreas de oportunidad e implementa cambios que mejoran continuamente los resultados de negocio.',5,false),
('Gestión','Orientación al Cliente','Entrega soluciones que satisfacen las necesidades y crean valor para el cliente.',6,false),
('Personas','Desarrollo de Talento','Asegura su autodesarrollo y crea un entorno adecuado para que los colaboradores puedan crecer y desarrollarse, apoyando el crecimiento del negocio.',7,false),
('Personas','Relaciones Efectivas','Desarrolla y mantiene relaciones de manera efectiva e inclusiva con diversos grupos de personas dentro y fuera de la Organización.',8,false);

INSERT INTO public.niveles_competencia (competencia_id, nivel, etiqueta, descripcion, resumen, es_demo)
SELECT c.id, d.nivel,
       (ARRAY['Básico','Esencial','Intermedio','Avanzado','Ejemplo a Seguir'])[d.nivel],
       d.descripcion, d.resumen, false
FROM public.competencias c
JOIN (VALUES
 (1,1,'Considera y entiende la información relevante de la Organización','Entiende información relevante'),
 (1,2,'Entiende la información relevante de la Organización, identifica tendencias y analiza posibles impactos','Identifica tendencias e impactos'),
 (1,3,'Contribuye a la generación de estrategias con propuestas que consideran información relevante del negocio y las tendencias globales de su entorno','Contribuye a generar estrategias'),
 (1,4,'Proyecta posibles escenarios y diseña estrategias de corto y mediano plazo para asegurar la sostenibilidad del negocio','Diseña estrategias de mediano plazo'),
 (1,5,'Anticipa la evolución del negocio, diseñando estrategias de largo plazo que incorporan una visión inspiradora y permiten adaptarse, de forma sostenible, a nuevas necesidades del mercado y contextos diversos','Anticipa la evolución del negocio'),
 (2,1,'Toma decisiones simples para realizar su trabajo','Toma decisiones simples'),
 (2,2,'Toma decisiones de forma autónoma basadas en procedimientos claros y acotados','Decide de forma autónoma'),
 (2,3,'Toma decisiones acertadas basadas en hechos y datos, manejando sus sesgos','Decide con hechos y datos'),
 (2,4,'Toma decisiones acertadas en situaciones complejas y ambiguas y las transforma en un plan que fija un curso de acción','Decide en contextos complejos'),
 (2,5,'Crea una cultura que empodera a las personas a asumir su responsabilidad, tomar decisiones de negocio y gestionar el riesgo','Crea cultura que empodera'),
 (3,1,'Entiende el impacto que tiene su trabajo en su área','Entiende su impacto en el área'),
 (3,2,'Entiende y dimensiona la interconexión de su trabajo con el resto de las áreas con las que interactúa','Dimensiona interconexión entre áreas'),
 (3,3,'Analiza su entorno de trabajo identificando las interrelaciones existentes con los otros procesos de la Organización','Identifica interrelaciones de procesos'),
 (3,4,'Analiza las situaciones del negocio y su entorno considerando las interrelaciones entre áreas y diversos puntos de vista de los actores clave de la Organización','Integra puntos de vista clave'),
 (3,5,'Analiza la evolución del negocio con un enfoque que integra múltiples perspectivas e interrelaciones existentes entre la Organización, el mercado y la comunidad','Integra negocio, mercado y comunidad'),
 (4,1,'Organiza su trabajo para cumplir con las tareas asignadas','Organiza sus tareas asignadas'),
 (4,2,'Organiza su trabajo para cumplir con sus compromisos y se hace responsable de los resultados','Responsable de sus resultados'),
 (4,3,'Planea, coordina y da seguimiento a la ejecución de los procesos de trabajo','Coordina y da seguimiento'),
 (4,4,'Establece protocolos de gestión, métricas de seguimiento y roles que aseguran la implementación de procesos de negocio y el logro de resultados','Establece protocolos y métricas'),
 (4,5,'Crea una cultura de alto desempeño que asegura el compromiso de sus equipos con el logro de resultados superiores y la sostenibilidad del negocio','Crea cultura de alto desempeño'),
 (5,1,'Incorpora en su trabajo nuevas ideas generadas por otros','Incorpora ideas de otros'),
 (5,2,'Cuestiona el status quo e implementa cambios que mejoran continuamente los resultados de su trabajo','Cuestiona el status quo'),
 (5,3,'Organiza y dirige continuamente iniciativas que mejoran los procesos y resultados de su área','Dirige iniciativas de mejora'),
 (5,4,'Promueve la diversidad de pensamiento, involucrando continuamente a distintas áreas para implementar cambios innovadores con impacto en la Organización y en los resultados del negocio','Impulsa cambios innovadores transversales'),
 (5,5,'Establece un sistema de trabajo y colaboración diverso e incluyente que desarrolla una cultura de mejora e innovación en la Organización','Desarrolla cultura de innovación'),
 (6,1,'Cumple con los requerimientos del cliente','Cumple requerimientos del cliente'),
 (6,2,'Entiende las necesidades y resuelve los problemas del cliente a través de su escucha activa','Resuelve con escucha activa'),
 (6,3,'Establece una relación empática con el cliente para conocer sus necesidades y entregarle soluciones a su medida','Entrega soluciones a la medida'),
 (6,4,'Conoce la estrategia de negocio del cliente para diseñar propuestas de valor que anticipan sus necesidades','Anticipa necesidades del cliente'),
 (6,5,'Crea una cultura orientada al cliente, movilizando a la Organización a mejorar la relación, el entendimiento y la satisfacción de sus necesidades','Crea cultura orientada al cliente'),
 (7,1,'Muestra interés por su propio desarrollo','Muestra interés por desarrollarse'),
 (7,2,'Busca desarrollarse constantemente para mejorar sus objetivos profesionales y personales y crecer en la Organización','Busca desarrollarse constantemente'),
 (7,3,'Conoce a las personas y reconoce la diversidad, facilitando ambientes de confianza y empoderamiento que promueven el desarrollo integral del talento','Facilita ambientes de confianza'),
 (7,4,'Anticipa necesidades de talento y crea oportunidades para el desarrollo integral que aseguran gente preparada para los retos de la Organización','Anticipa necesidades de talento'),
 (7,5,'Crea un entorno inclusivo que asegura el desarrollo integral del talento que permite construir equipos diversos con capacidad y potencial para hacer crecer el negocio','Crea entorno inclusivo de desarrollo'),
 (8,1,'Colabora y genera las relaciones necesarias con sus compañeros de trabajo','Colabora con sus compañeros'),
 (8,2,'Colabora y genera relaciones efectivas en su entorno de trabajo, respetando a las personas con formas de pensar diferente','Genera relaciones efectivas cercanas'),
 (8,3,'Trabaja de forma incluyente, coordinada y constructiva con diversas áreas y personas para lograr objetivos compartidos','Trabaja incluyente entre áreas'),
 (8,4,'Colabora de forma efectiva con distintas áreas y gestiona relaciones complejas con actores internos y externos clave para la Organización, con experiencias, estilos y perspectivas diversas','Gestiona relaciones complejas clave'),
 (8,5,'Su reputación y prestigio profesional le permite desarrollar relaciones estratégicas que benefician y posicionan el nombre de la empresa dentro y fuera de la Organización','Desarrolla relaciones estratégicas externas')
) AS d(orden, nivel, descripcion, resumen) ON d.orden = c.orden;

-- Propuesta de perfil de competencias por puesto según nivel organizacional
WITH metas(nivel_org, orden, meta) AS (
  SELECT m.nivel_org, g.orden, m.metas[g.orden]
  FROM (VALUES
    ('D1', ARRAY[5,5,5,5,4,4,5,5]),
    ('D2', ARRAY[4,5,4,5,4,4,4,4]),
    ('G1', ARRAY[4,4,4,5,4,4,4,4]),
    ('C1', ARRAY[2,3,3,4,3,4,3,3]),
    ('C2', ARRAY[2,3,2,4,3,3,2,3]),
    ('E1', ARRAY[2,3,3,4,3,4,2,3]),
    ('A1', ARRAY[1,2,2,3,2,3,2,2])
  ) AS m(nivel_org, metas)
  CROSS JOIN generate_series(1,8) AS g(orden)
), perfil AS (
  SELECT p.id AS puesto_id,
         jsonb_object_agg(c.id::text, m.meta) AS niveles
  FROM public.puestos p
  JOIN metas m ON m.nivel_org = COALESCE(p.nivel_organizacional, 'E1')
  JOIN public.competencias c ON c.orden = m.orden
  GROUP BY p.id
)
UPDATE public.puestos p
SET perfil_competencias = jsonb_build_object(
      'validado', false,
      'fecha_validacion', NULL,
      'validado_por', NULL,
      'niveles', perfil.niveles
    ),
    updated_at = now()
FROM perfil
WHERE perfil.puesto_id = p.id;
