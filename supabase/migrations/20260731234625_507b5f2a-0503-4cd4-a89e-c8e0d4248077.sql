-- ============ 1. Catálogo de valores de Escala ============
CREATE TABLE public.catalogo_valores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clave text NOT NULL UNIQUE,
  nombre text NOT NULL,
  descripcion text,
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  es_demo boolean NOT NULL DEFAULT false,
  creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalogo_valores TO authenticated;
GRANT ALL ON public.catalogo_valores TO service_role;
ALTER TABLE public.catalogo_valores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "valores visibles" ON public.catalogo_valores FOR SELECT TO authenticated USING (true);
CREATE POLICY "talento administra valores" ON public.catalogo_valores FOR ALL TO authenticated
  USING (public.es('direccion_talento')) WITH CHECK (public.es('direccion_talento'));
CREATE TRIGGER trg_valores_updated BEFORE UPDATE ON public.catalogo_valores
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- ============ 2. Encuestas: estatus y cierre ============
ALTER TABLE public.encuestas
  ADD COLUMN IF NOT EXISTS estatus text NOT NULL DEFAULT 'vigente',
  ADD COLUMN IF NOT EXISTS cerrada_en timestamptz,
  ADD COLUMN IF NOT EXISTS cerrada_por uuid;

DROP POLICY IF EXISTS "direccion consulta" ON public.encuestas;
CREATE POLICY "encuestas visibles" ON public.encuestas FOR SELECT TO authenticated USING (true);
CREATE POLICY "direccion general administra encuestas" ON public.encuestas FOR ALL TO authenticated
  USING (public.es('direccion_general')) WITH CHECK (public.es('direccion_general'));

-- ============ 3. Sal secreta e identificador irreversible ============
CREATE TABLE public.sal_bienestar (
  id integer PRIMARY KEY DEFAULT 1,
  sal text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sal_unica CHECK (id = 1)
);
ALTER TABLE public.sal_bienestar ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sal_bienestar FROM anon, authenticated;
INSERT INTO public.sal_bienestar (id, sal)
VALUES (1, encode(extensions.gen_random_bytes(32), 'hex'));

CREATE OR REPLACE FUNCTION public.hash_respuesta(_encuesta uuid, _colab uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT encode(
    extensions.hmac(_encuesta::text || ':' || _colab::text,
                    (SELECT sal FROM public.sal_bienestar WHERE id = 1), 'sha256'),
    'hex')
$$;
REVOKE ALL ON FUNCTION public.hash_respuesta(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- ============ 4. Respuestas: cortes agregados, cero acceso directo ============
ALTER TABLE public.respuestas_encuesta
  ADD COLUMN IF NOT EXISTS ubicacion text,
  ADD COLUMN IF NOT EXISTS area text;

DROP POLICY IF EXISTS "direccion consulta" ON public.respuestas_encuesta;
DROP POLICY IF EXISTS "talento administra" ON public.respuestas_encuesta;
REVOKE ALL ON public.respuestas_encuesta FROM anon, authenticated;
GRANT ALL ON public.respuestas_encuesta TO service_role;

CREATE OR REPLACE FUNCTION public.responder_encuesta(_encuesta uuid, _respuestas jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE _colab uuid; _hash text; _ubic text; _area text; _estatus text;
BEGIN
  _colab := public.mi_colaborador_id();
  IF _colab IS NULL THEN RAISE EXCEPTION 'Sin expediente vinculado'; END IF;
  SELECT estatus INTO _estatus FROM public.encuestas WHERE id = _encuesta;
  IF _estatus IS NULL THEN RAISE EXCEPTION 'Encuesta inexistente'; END IF;
  IF _estatus <> 'vigente' THEN RAISE EXCEPTION 'La encuesta está cerrada'; END IF;
  SELECT ubicacion::text, area INTO _ubic, _area FROM public.colaboradores WHERE id = _colab;
  _hash := public.hash_respuesta(_encuesta, _colab);
  DELETE FROM public.respuestas_encuesta WHERE encuesta_id = _encuesta AND colaborador_hash = _hash;
  INSERT INTO public.respuestas_encuesta (encuesta_id, colaborador_hash, reactivo_id, valor, ubicacion, area)
  SELECT _encuesta, _hash, e.key, (e.value #>> '{}')::numeric, _ubic, _area
  FROM jsonb_each(_respuestas) e;
END $$;
GRANT EXECUTE ON FUNCTION public.responder_encuesta(uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.ya_respondi(_encuesta uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE _colab uuid;
BEGIN
  _colab := public.mi_colaborador_id();
  IF _colab IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.respuestas_encuesta
    WHERE encuesta_id = _encuesta
      AND colaborador_hash = public.hash_respuesta(_encuesta, _colab));
END $$;
GRANT EXECUTE ON FUNCTION public.ya_respondi(uuid) TO authenticated;

-- Avance de cobertura: cuántas personas van, nunca quiénes.
CREATE OR REPLACE FUNCTION public.encuesta_avance(_encuesta uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(DISTINCT colaborador_hash)::int
  FROM public.respuestas_encuesta WHERE encuesta_id = _encuesta
$$;
GRANT EXECUTE ON FUNCTION public.encuesta_avance(uuid) TO authenticated;

-- Tamaño de cada corte (headcount, no resultados): permite explicar la supresión.
CREATE OR REPLACE FUNCTION public.clima_grupos(_encuesta uuid, _corte text DEFAULT 'firma')
RETURNS TABLE(grupo text, personas integer, suprimido boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.grupo, g.personas::int, (g.personas < 5) AS suprimido
  FROM (
    SELECT CASE _corte
             WHEN 'ubicacion' THEN coalesce(r.ubicacion, 'Sin ubicación')
             WHEN 'area' THEN coalesce(r.area, 'Sin área')
             ELSE 'Firma completa' END AS grupo,
           count(DISTINCT r.colaborador_hash) AS personas
    FROM public.respuestas_encuesta r
    WHERE r.encuesta_id = _encuesta
    GROUP BY 1
  ) g
  WHERE public.es('direccion_talento') OR public.es('direccion_general')
  ORDER BY g.personas DESC, g.grupo
$$;
GRANT EXECUTE ON FUNCTION public.clima_grupos(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.clima_reactivos(_encuesta uuid, _corte text DEFAULT 'firma')
RETURNS TABLE(grupo text, reactivo_id text, personas integer, respuestas integer, promedio numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH r AS (
    SELECT CASE _corte
             WHEN 'ubicacion' THEN coalesce(ubicacion, 'Sin ubicación')
             WHEN 'area' THEN coalesce(area, 'Sin área')
             ELSE 'Firma completa' END AS grupo,
           colaborador_hash, reactivo_id, valor
    FROM public.respuestas_encuesta
    WHERE encuesta_id = _encuesta
      AND (public.es('direccion_talento') OR public.es('direccion_general'))
  ), tam AS (
    SELECT grupo, count(DISTINCT colaborador_hash) AS personas FROM r GROUP BY grupo
  )
  SELECT r.grupo, r.reactivo_id, tam.personas::int, count(*)::int, round(avg(r.valor), 2)
  FROM r JOIN tam ON tam.grupo = r.grupo
  WHERE tam.personas >= 5
  GROUP BY r.grupo, r.reactivo_id, tam.personas
  ORDER BY r.grupo, r.reactivo_id
$$;
GRANT EXECUTE ON FUNCTION public.clima_reactivos(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.clima_enps(_encuesta uuid, _corte text DEFAULT 'firma')
RETURNS TABLE(grupo text, personas integer, promotores integer, pasivos integer,
              detractores integer, enps numeric, suprimido boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH r AS (
    SELECT CASE _corte
             WHEN 'ubicacion' THEN coalesce(ubicacion, 'Sin ubicación')
             WHEN 'area' THEN coalesce(area, 'Sin área')
             ELSE 'Firma completa' END AS grupo,
           colaborador_hash, valor
    FROM public.respuestas_encuesta
    WHERE encuesta_id = _encuesta AND reactivo_id = 'enps'
      AND (public.es('direccion_talento') OR public.es('direccion_general'))
  ), agg AS (
    SELECT grupo,
           count(DISTINCT colaborador_hash)::int AS personas,
           count(*) FILTER (WHERE valor >= 9)::int AS promotores,
           count(*) FILTER (WHERE valor >= 7 AND valor < 9)::int AS pasivos,
           count(*) FILTER (WHERE valor <= 6)::int AS detractores,
           count(*)::numeric AS total
    FROM r GROUP BY grupo
  )
  SELECT grupo, personas,
         CASE WHEN personas >= 5 THEN promotores END,
         CASE WHEN personas >= 5 THEN pasivos END,
         CASE WHEN personas >= 5 THEN detractores END,
         CASE WHEN personas >= 5 AND total > 0
              THEN round((promotores - detractores) * 100.0 / total, 1) END,
         personas < 5
  FROM agg ORDER BY personas DESC, grupo
$$;
GRANT EXECUTE ON FUNCTION public.clima_enps(uuid, text) TO authenticated;

-- ============ 5. Pulsos de ánimo: nadie lee el individual ajeno ============
DROP POLICY IF EXISTS "direccion consulta" ON public.pulsos_animo;
DROP POLICY IF EXISTS "talento administra" ON public.pulsos_animo;
CREATE POLICY "corregir pulso propio" ON public.pulsos_animo FOR UPDATE TO authenticated
  USING (colaborador_id = public.mi_colaborador_id())
  WITH CHECK (colaborador_id = public.mi_colaborador_id());
CREATE POLICY "borrar pulso propio" ON public.pulsos_animo FOR DELETE TO authenticated
  USING (colaborador_id = public.mi_colaborador_id());
ALTER TABLE public.pulsos_animo
  ADD CONSTRAINT pulso_unico_por_dia UNIQUE (colaborador_id, fecha);

CREATE OR REPLACE FUNCTION public.animo_firma(_desde date, _hasta date)
RETURNS TABLE(personas integer, registros integer, promedio numeric, suprimido boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(DISTINCT colaborador_id)::int,
         CASE WHEN count(DISTINCT colaborador_id) >= 5 THEN count(*)::int END,
         CASE WHEN count(DISTINCT colaborador_id) >= 5 THEN round(avg(valor), 2) END,
         count(DISTINCT colaborador_id) < 5
  FROM public.pulsos_animo
  WHERE fecha BETWEEN _desde AND _hasta
    AND (public.es('direccion_talento') OR public.es('direccion_general'))
$$;
GRANT EXECUTE ON FUNCTION public.animo_firma(date, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.animo_serie_firma(_desde date, _hasta date)
RETURNS TABLE(semana date, personas integer, promedio numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT date_trunc('week', fecha)::date AS semana,
         count(DISTINCT colaborador_id)::int,
         round(avg(valor), 2)
  FROM public.pulsos_animo
  WHERE fecha BETWEEN _desde AND _hasta
    AND (public.es('direccion_talento') OR public.es('direccion_general'))
  GROUP BY 1 HAVING count(DISTINCT colaborador_id) >= 5
  ORDER BY 1
$$;
GRANT EXECUTE ON FUNCTION public.animo_serie_firma(date, date) TO authenticated;

-- Promedio del equipo propio, y solo si el equipo llega a cinco personas con pulso.
CREATE OR REPLACE FUNCTION public.animo_equipo(_desde date, _hasta date)
RETURNS TABLE(personas integer, promedio numeric, suprimido boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(DISTINCT p.colaborador_id)::int,
         CASE WHEN count(DISTINCT p.colaborador_id) >= 5 THEN round(avg(p.valor), 2) END,
         count(DISTINCT p.colaborador_id) < 5
  FROM public.pulsos_animo p
  JOIN public.colaboradores c ON c.id = p.colaborador_id
  WHERE c.lider_id = public.mi_colaborador_id()
    AND p.fecha BETWEEN _desde AND _hasta
$$;
GRANT EXECUTE ON FUNCTION public.animo_equipo(date, date) TO authenticated;

-- Comentarios desligados de la persona, solo Dirección de Talento y con mínimo de cinco.
CREATE OR REPLACE FUNCTION public.animo_comentarios(_desde date, _hasta date)
RETURNS TABLE(comentario text, valor integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH c AS (
    SELECT comentario_opcional, valor
    FROM public.pulsos_animo
    WHERE fecha BETWEEN _desde AND _hasta
      AND comentario_opcional IS NOT NULL AND btrim(comentario_opcional) <> ''
      AND public.es('direccion_talento')
  )
  SELECT comentario_opcional, valor FROM c
  WHERE (SELECT count(DISTINCT comentario_opcional) FROM c) >= 5
  ORDER BY md5(comentario_opcional)
$$;
GRANT EXECUTE ON FUNCTION public.animo_comentarios(date, date) TO authenticated;

-- ============ 6. Reconocimientos ============
ALTER TABLE public.reconocimientos
  ADD CONSTRAINT reconocimiento_no_a_uno_mismo CHECK (de_id IS DISTINCT FROM para_id);
DROP POLICY IF EXISTS "enviar reconocimiento" ON public.reconocimientos;
CREATE POLICY "enviar reconocimiento" ON public.reconocimientos FOR INSERT TO authenticated
  WITH CHECK (de_id = public.mi_colaborador_id() AND para_id IS DISTINCT FROM de_id);

CREATE OR REPLACE FUNCTION public.participacion_reconocimientos(_desde date, _hasta date)
RETURNS TABLE(personas integer, plantilla integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (SELECT count(DISTINCT x)::int FROM (
            SELECT unnest(array[de_id, para_id]) AS x
            FROM public.reconocimientos WHERE fecha BETWEEN _desde AND _hasta
          ) t WHERE x IS NOT NULL),
         (SELECT count(*)::int FROM public.colaboradores WHERE estatus = 'activo')
$$;
GRANT EXECUTE ON FUNCTION public.participacion_reconocimientos(date, date) TO authenticated;

-- ============ 7. Semilla de demostración ============
INSERT INTO public.catalogo_valores (clave, nombre, descripcion, orden, es_demo) VALUES
  ('seguridad', 'Seguridad primero', '[Dato requerido de Escala] valor de demostración, pendiente de confirmar.', 1, true),
  ('oficio', 'Oficio', '[Dato requerido de Escala] valor de demostración, pendiente de confirmar.', 2, true),
  ('palabra', 'Palabra cumplida', '[Dato requerido de Escala] valor de demostración, pendiente de confirmar.', 3, true),
  ('equipo', 'Trabajo en equipo', '[Dato requerido de Escala] valor de demostración, pendiente de confirmar.', 4, true),
  ('mejora', 'Mejora continua', '[Dato requerido de Escala] valor de demostración, pendiente de confirmar.', 5, true);

INSERT INTO public.supuestos_financieros (clave, descripcion, valor, unidad, fuente, fecha_actualizacion, es_demo)
VALUES
  ('enps_meta', 'Meta de eNPS de la firma', 30, 'puntos', '[Dato requerido de Escala] valor de demostración', now(), true),
  ('enps_linea_base', 'Línea base de eNPS del ciclo anterior', 10, 'puntos', '[Dato requerido de Escala] valor de demostración', now(), true),
  ('animo_meta', 'Meta de ánimo promedio (escala 1 a 5)', 4, 'puntos', '[Dato requerido de Escala] valor de demostración', now(), true),
  ('participacion_reconocimientos_meta', 'Meta de participación trimestral en reconocimientos', 60, '%', '[Dato requerido de Escala] valor de demostración', now(), true)
ON CONFLICT (clave) DO NOTHING;

DO $seed$
DECLARE _cerrada uuid; _vigente uuid;
BEGIN
  INSERT INTO public.encuestas (nombre, tipo, fecha_inicio, fecha_fin, cobertura_objetivo, estatus, es_demo)
  VALUES ('Clima y compromiso · primer semestre 2026', 'gptw', DATE '2026-02-02', DATE '2026-02-20', 30, 'cerrada', true)
  RETURNING id INTO _cerrada;
  UPDATE public.encuestas SET cerrada_en = TIMESTAMPTZ '2026-02-23 18:00+00' WHERE id = _cerrada;

  INSERT INTO public.encuestas (nombre, tipo, fecha_inicio, fecha_fin, cobertura_objetivo, estatus, es_demo)
  VALUES ('Clima y compromiso · segundo semestre 2026', 'gptw', DATE '2026-07-13', DATE '2026-08-14', 30, 'vigente', true)
  RETURNING id INTO _vigente;

  INSERT INTO public.respuestas_encuesta (encuesta_id, colaborador_hash, reactivo_id, valor, ubicacion, area, es_demo)
  SELECT e.enc,
         public.hash_respuesta(e.enc, b.id),
         r.reactivo,
         CASE WHEN r.reactivo = 'enps'
              THEN (ARRAY[5,7,9,10,8,6,9,10,4,8])[1 + ((b.rn + e.off) % 10)]
              ELSE (ARRAY[2,3,4,4,5,3,5,4])[1 + ((b.rn + e.off + length(r.reactivo)) % 8)] END,
         b.ubic, b.area, true
  FROM (VALUES (_cerrada, 0, 15, 7), (_vigente, 3, 18, 8)) AS e(enc, off, tope_campo, tope_corp)
  CROSS JOIN LATERAL (
    SELECT c.id, c.area, c.ubicacion::text AS ubic,
           row_number() OVER (PARTITION BY c.ubicacion ORDER BY c.id) AS rn
    FROM public.colaboradores c WHERE c.estatus = 'activo'
  ) b
  CROSS JOIN (VALUES ('enps'), ('confianza'), ('orgullo'), ('camaraderia'), ('imparcialidad'), ('seguridad_psicologica')) AS r(reactivo)
  WHERE (b.ubic = 'campo' AND b.rn <= e.tope_campo) OR (b.ubic = 'corporativo' AND b.rn <= e.tope_corp);
END $seed$;

-- Pulsos de ánimo: ocho semanas, variación natural, algunos comentarios.
INSERT INTO public.pulsos_animo (colaborador_id, fecha, valor, comentario_opcional, proyecto_id, es_demo)
SELECT b.id,
       (CURRENT_DATE - (s.semana * 7) - ((b.rn + s.semana) % 5))::date,
       (ARRAY[4,3,5,4,2,4,3,5,4,3])[1 + ((b.rn * 3 + s.semana * 2) % 10)],
       CASE WHEN (b.rn + s.semana) % 11 = 0
            THEN (ARRAY[
              'La carga de la semana estuvo pesada, pero el frente salió.',
              'Falta claridad en la programación del siguiente mes.',
              'Buen acompañamiento del líder en el cierre.',
              'Los traslados a obra están cansando al equipo.',
              'Se agradece que hayan resuelto rápido el tema de materiales.',
              'Hace falta más comunicación entre oficina y campo.'
            ])[1 + ((b.rn + s.semana) % 6)] END,
       b.proyecto_actual_id, true
FROM (
  SELECT c.id, c.proyecto_actual_id, (row_number() OVER (ORDER BY c.id))::int AS rn
  FROM public.colaboradores c WHERE c.estatus = 'activo'
) b
CROSS JOIN generate_series(0, 7) AS s(semana)
WHERE b.rn <= 28
ON CONFLICT (colaborador_id, fecha) DO NOTHING;

-- Veinte reconocimientos repartidos entre personas y valores, algunos privados.
INSERT INTO public.reconocimientos (de_id, para_id, valor_asociado, mensaje, fecha, publico, es_demo)
SELECT d.id, p.id,
       (ARRAY['seguridad','oficio','palabra','equipo','mejora'])[1 + (d.rn % 5)],
       (ARRAY[
         'Detuvo la maniobra hasta que el arnés estuvo bien anclado. Eso es poner la seguridad antes que el avance.',
         'Resolvió el detalle de armado en sitio sin parar el frente y dejó el procedimiento escrito.',
         'Se comprometió con la fecha de entrega del paquete y la cumplió sin recordatorios.',
         'Se quedó a apoyar al frente de instalaciones aunque no era su alcance.',
         'Propuso el cambio en la secuencia de colado y nos ahorró dos días por nivel.'
       ])[1 + (d.rn % 5)],
       (CURRENT_DATE - (d.rn * 4))::date,
       (d.rn % 4) <> 0,
       true
FROM (
  SELECT c.id, (row_number() OVER (ORDER BY c.id))::int AS rn
  FROM public.colaboradores c WHERE c.estatus = 'activo'
) d
JOIN (
  SELECT c.id, (row_number() OVER (ORDER BY c.id))::int AS rn
  FROM public.colaboradores c WHERE c.estatus = 'activo'
) p ON p.rn = ((d.rn + 6) % 35) + 1
WHERE d.rn <= 20 AND p.id <> d.id;