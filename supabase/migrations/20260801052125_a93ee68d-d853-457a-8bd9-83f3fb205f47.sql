-- 1. Umbral de agregación configurable
CREATE TABLE public.parametros_bienestar (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  umbral_agregacion integer NOT NULL DEFAULT 3 CHECK (umbral_agregacion BETWEEN 3 AND 10),
  actualizado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.parametros_bienestar TO authenticated;
GRANT ALL ON public.parametros_bienestar TO service_role;
ALTER TABLE public.parametros_bienestar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos leen el umbral" ON public.parametros_bienestar
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Talento y Dirección General editan el umbral" ON public.parametros_bienestar
  FOR UPDATE TO authenticated
  USING (public.es('direccion_talento') OR public.es('direccion_general'))
  WITH CHECK (public.es('direccion_talento') OR public.es('direccion_general'));
CREATE TRIGGER trg_parametros_bienestar_updated_at BEFORE UPDATE ON public.parametros_bienestar
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();
INSERT INTO public.parametros_bienestar (id, umbral_agregacion) VALUES (1, 3);

CREATE OR REPLACE FUNCTION public.umbral_agregacion()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT umbral_agregacion FROM public.parametros_bienestar WHERE id = 1), 5);
$$;

-- 2. Catálogo de grupos de reporte
CREATE TABLE public.grupos_reporte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  descripcion text,
  areas text[] NOT NULL DEFAULT '{}',
  activo boolean NOT NULL DEFAULT true,
  es_demo boolean NOT NULL DEFAULT false,
  creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupos_reporte TO authenticated;
GRANT ALL ON public.grupos_reporte TO service_role;
ALTER TABLE public.grupos_reporte ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos leen los grupos de reporte" ON public.grupos_reporte
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Talento crea grupos de reporte" ON public.grupos_reporte
  FOR INSERT TO authenticated WITH CHECK (public.es('direccion_talento'));
CREATE POLICY "Talento edita grupos de reporte" ON public.grupos_reporte
  FOR UPDATE TO authenticated USING (public.es('direccion_talento')) WITH CHECK (public.es('direccion_talento'));
CREATE POLICY "Talento elimina grupos de reporte" ON public.grupos_reporte
  FOR DELETE TO authenticated USING (public.es('direccion_talento'));
CREATE TRIGGER trg_grupos_reporte_updated_at BEFORE UPDATE ON public.grupos_reporte
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- Sin traslape de áreas entre grupos
CREATE OR REPLACE FUNCTION public.tg_grupos_sin_traslape()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _otro text;
BEGIN
  SELECT g.nombre INTO _otro FROM public.grupos_reporte g
  WHERE g.id <> NEW.id AND g.areas && NEW.areas LIMIT 1;
  IF _otro IS NOT NULL THEN
    RAISE EXCEPTION 'Un área no puede pertenecer a dos grupos: ya está en «%»', _otro;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_grupos_sin_traslape BEFORE INSERT OR UPDATE ON public.grupos_reporte
  FOR EACH ROW EXECUTE FUNCTION public.tg_grupos_sin_traslape();

-- 3. Congelado de la definición al abrir la encuesta
CREATE TABLE public.encuesta_grupos_reporte (
  encuesta_id uuid PRIMARY KEY REFERENCES public.encuestas(id) ON DELETE CASCADE,
  definicion jsonb NOT NULL,
  congelado_en timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.encuesta_grupos_reporte TO authenticated;
GRANT ALL ON public.encuesta_grupos_reporte TO service_role;
ALTER TABLE public.encuesta_grupos_reporte ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos leen la definición congelada" ON public.encuesta_grupos_reporte
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.definicion_grupos_actual()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('nombre', g.nombre, 'areas', to_jsonb(g.areas))
           ORDER BY g.nombre), '[]'::jsonb)
  FROM public.grupos_reporte g WHERE g.activo;
$$;

CREATE OR REPLACE FUNCTION public.tg_congelar_grupos()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.estatus = 'vigente' THEN
    INSERT INTO public.encuesta_grupos_reporte (encuesta_id, definicion)
    VALUES (NEW.id, public.definicion_grupos_actual())
    ON CONFLICT (encuesta_id) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_congelar_grupos AFTER INSERT OR UPDATE OF estatus ON public.encuestas
  FOR EACH ROW EXECUTE FUNCTION public.tg_congelar_grupos();

-- Bloqueo de edición mientras una encuesta vigente use el grupo
CREATE OR REPLACE FUNCTION public.tg_grupos_bloqueo_vigente()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _enc text; _nombre text;
BEGIN
  _nombre := COALESCE(OLD.nombre, NEW.nombre);
  SELECT e.nombre INTO _enc
  FROM public.encuestas e
  JOIN public.encuesta_grupos_reporte s ON s.encuesta_id = e.id
  WHERE e.estatus = 'vigente'
    AND EXISTS (SELECT 1 FROM jsonb_array_elements(s.definicion) g WHERE g->>'nombre' = _nombre)
  LIMIT 1;
  IF _enc IS NOT NULL THEN
    RAISE EXCEPTION 'El grupo «%» está congelado en la encuesta vigente «%». Ciérrala antes de reacomodar los grupos.', _nombre, _enc;
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;
CREATE TRIGGER trg_grupos_bloqueo_vigente BEFORE UPDATE OR DELETE ON public.grupos_reporte
  FOR EACH ROW EXECUTE FUNCTION public.tg_grupos_bloqueo_vigente();

-- 4. Mapa de áreas a grupos según la definición congelada (o la vigente si no hay congelada)
CREATE OR REPLACE FUNCTION public.mapa_grupos_encuesta(_encuesta uuid)
RETURNS TABLE(area text, grupo text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.valor, g.def->>'nombre'
  FROM public.encuesta_grupos_reporte s,
       LATERAL jsonb_array_elements(s.definicion) AS g(def),
       LATERAL jsonb_array_elements_text(g.def->'areas') AS a(valor)
  WHERE s.encuesta_id = _encuesta
  UNION ALL
  SELECT unnest(gr.areas), gr.nombre
  FROM public.grupos_reporte gr
  WHERE gr.activo
    AND NOT EXISTS (SELECT 1 FROM public.encuesta_grupos_reporte s2 WHERE s2.encuesta_id = _encuesta);
$$;

CREATE OR REPLACE FUNCTION public.definicion_grupos_encuesta(_encuesta uuid)
RETURNS TABLE(congelado_en timestamptz, difiere boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.congelado_en, (s.definicion IS DISTINCT FROM public.definicion_grupos_actual())
  FROM public.encuesta_grupos_reporte s WHERE s.encuesta_id = _encuesta;
$$;

-- 5. Funciones agregadas: umbral dinámico y corte por grupo
CREATE OR REPLACE FUNCTION public.animo_equipo(_desde date, _hasta date)
RETURNS TABLE(personas integer, promedio numeric, suprimido boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(DISTINCT p.colaborador_id)::int,
         CASE WHEN count(DISTINCT p.colaborador_id) >= public.umbral_agregacion() THEN round(avg(p.valor), 2) END,
         count(DISTINCT p.colaborador_id) < public.umbral_agregacion()
  FROM public.pulsos_animo p
  JOIN public.colaboradores c ON c.id = p.colaborador_id
  WHERE c.lider_id = public.mi_colaborador_id()
    AND p.fecha BETWEEN _desde AND _hasta
$$;

CREATE OR REPLACE FUNCTION public.animo_firma(_desde date, _hasta date)
RETURNS TABLE(personas integer, registros integer, promedio numeric, suprimido boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(DISTINCT colaborador_id)::int,
         CASE WHEN count(DISTINCT colaborador_id) >= public.umbral_agregacion() THEN count(*)::int END,
         CASE WHEN count(DISTINCT colaborador_id) >= public.umbral_agregacion() THEN round(avg(valor), 2) END,
         count(DISTINCT colaborador_id) < public.umbral_agregacion()
  FROM public.pulsos_animo
  WHERE fecha BETWEEN _desde AND _hasta
    AND (public.es('direccion_talento') OR public.es('direccion_general'))
$$;

CREATE OR REPLACE FUNCTION public.animo_serie_firma(_desde date, _hasta date)
RETURNS TABLE(semana date, personas integer, promedio numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT date_trunc('week', fecha)::date AS semana,
         count(DISTINCT colaborador_id)::int,
         round(avg(valor), 2)
  FROM public.pulsos_animo
  WHERE fecha BETWEEN _desde AND _hasta
    AND (public.es('direccion_talento') OR public.es('direccion_general'))
  GROUP BY 1 HAVING count(DISTINCT colaborador_id) >= public.umbral_agregacion()
  ORDER BY 1
$$;

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
  WHERE (SELECT count(DISTINCT comentario_opcional) FROM c) >= public.umbral_agregacion()
  ORDER BY md5(comentario_opcional)
$$;

CREATE OR REPLACE FUNCTION public.clima_grupos(_encuesta uuid, _corte text DEFAULT 'firma'::text)
RETURNS TABLE(grupo text, personas integer, suprimido boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.grupo, g.personas::int, (g.personas < public.umbral_agregacion()) AS suprimido
  FROM (
    SELECT CASE _corte
             WHEN 'ubicacion' THEN coalesce(r.ubicacion, 'Sin ubicación')
             WHEN 'area' THEN coalesce(r.area, 'Sin área')
             WHEN 'grupo' THEN coalesce(m.grupo, 'Sin grupo de reporte')
             ELSE 'Firma completa' END AS grupo,
           count(DISTINCT r.colaborador_hash) AS personas
    FROM public.respuestas_encuesta r
    LEFT JOIN public.mapa_grupos_encuesta(_encuesta) m ON m.area = r.area
    WHERE r.encuesta_id = _encuesta
    GROUP BY 1
  ) g
  WHERE public.es('direccion_talento') OR public.es('direccion_general')
  ORDER BY g.personas DESC, g.grupo
$$;

CREATE OR REPLACE FUNCTION public.clima_enps(_encuesta uuid, _corte text DEFAULT 'firma'::text)
RETURNS TABLE(grupo text, personas integer, promotores integer, pasivos integer, detractores integer, enps numeric, suprimido boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH r AS (
    SELECT CASE _corte
             WHEN 'ubicacion' THEN coalesce(re.ubicacion, 'Sin ubicación')
             WHEN 'area' THEN coalesce(re.area, 'Sin área')
             WHEN 'grupo' THEN coalesce(m.grupo, 'Sin grupo de reporte')
             ELSE 'Firma completa' END AS grupo,
           re.colaborador_hash, re.valor
    FROM public.respuestas_encuesta re
    LEFT JOIN public.mapa_grupos_encuesta(_encuesta) m ON m.area = re.area
    WHERE re.encuesta_id = _encuesta AND re.reactivo_id = 'enps'
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
         CASE WHEN personas >= public.umbral_agregacion() THEN promotores END,
         CASE WHEN personas >= public.umbral_agregacion() THEN pasivos END,
         CASE WHEN personas >= public.umbral_agregacion() THEN detractores END,
         CASE WHEN personas >= public.umbral_agregacion() AND total > 0
              THEN round((promotores - detractores) * 100.0 / total, 1) END,
         personas < public.umbral_agregacion()
  FROM agg ORDER BY personas DESC, grupo
$$;

CREATE OR REPLACE FUNCTION public.clima_reactivos(_encuesta uuid, _corte text DEFAULT 'firma'::text)
RETURNS TABLE(grupo text, reactivo_id text, personas integer, respuestas integer, promedio numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH r AS (
    SELECT CASE _corte
             WHEN 'ubicacion' THEN coalesce(re.ubicacion, 'Sin ubicación')
             WHEN 'area' THEN coalesce(re.area, 'Sin área')
             WHEN 'grupo' THEN coalesce(m.grupo, 'Sin grupo de reporte')
             ELSE 'Firma completa' END AS grupo,
           re.colaborador_hash, re.reactivo_id, re.valor
    FROM public.respuestas_encuesta re
    LEFT JOIN public.mapa_grupos_encuesta(_encuesta) m ON m.area = re.area
    WHERE re.encuesta_id = _encuesta
      AND (public.es('direccion_talento') OR public.es('direccion_general'))
  ), tam AS (
    SELECT grupo, count(DISTINCT colaborador_hash) AS personas FROM r GROUP BY grupo
  )
  SELECT r.grupo, r.reactivo_id, tam.personas::int, count(*)::int, round(avg(r.valor), 2)
  FROM r JOIN tam ON tam.grupo = r.grupo
  WHERE tam.personas >= public.umbral_agregacion()
  GROUP BY r.grupo, r.reactivo_id, tam.personas
  ORDER BY r.grupo, r.reactivo_id
$$;

-- 6. Grupos de demostración
INSERT INTO public.grupos_reporte (nombre, descripcion, areas, es_demo) VALUES
  ('Proyectos y obra', 'Áreas de ejecución de obra y coordinación técnica.',
   ARRAY['Proyectos','BIM','MEP','Lean','Oficina de Administración de Proyectos'], true),
  ('Soporte corporativo', 'Áreas de soporte que por sí solas no alcanzan el umbral de agregación.',
   ARRAY['Costos','Finanzas','Sistemas','PMO','Talento'], true),
  ('Dirección', 'Dirección general y direcciones de área.', ARRAY['Dirección'], true);

-- Congela la definición para las encuestas vigentes que ya existen
INSERT INTO public.encuesta_grupos_reporte (encuesta_id, definicion)
SELECT e.id, public.definicion_grupos_actual() FROM public.encuestas e WHERE e.estatus = 'vigente'
ON CONFLICT (encuesta_id) DO NOTHING;