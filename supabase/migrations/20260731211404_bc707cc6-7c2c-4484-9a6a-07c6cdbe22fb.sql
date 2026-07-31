CREATE TABLE public.catalogo_vacaciones_lft (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anios_min integer NOT NULL,
  anios_max integer,
  dias_ley numeric NOT NULL,
  fuente text NOT NULL DEFAULT 'Ley Federal del Trabajo, artículo 76 (reforma DOF 27/12/2022, vigente 01/01/2023)',
  vigente_desde date NOT NULL DEFAULT DATE '2023-01-01',
  requiere_vb_juridico boolean NOT NULL DEFAULT true,
  nota text,
  es_demo boolean NOT NULL DEFAULT false,
  creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (anios_min)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalogo_vacaciones_lft TO authenticated;
GRANT ALL ON public.catalogo_vacaciones_lft TO service_role;

ALTER TABLE public.catalogo_vacaciones_lft ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalogo lft lectura" ON public.catalogo_vacaciones_lft
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "catalogo lft administra" ON public.catalogo_vacaciones_lft
  FOR ALL TO authenticated
  USING (public.es('direccion_talento') OR public.es('ti_sistema'))
  WITH CHECK (public.es('direccion_talento') OR public.es('ti_sistema'));

CREATE TRIGGER catalogo_vacaciones_lft_updated_at
  BEFORE UPDATE ON public.catalogo_vacaciones_lft
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

INSERT INTO public.catalogo_vacaciones_lft (anios_min, anios_max, dias_ley, nota) VALUES
  (1, 1, 12, 'Primer año cumplido'),
  (2, 2, 14, NULL),
  (3, 3, 16, NULL),
  (4, 4, 18, NULL),
  (5, 5, 20, 'Tope del incremento anual'),
  (6, 10, 22, 'A partir del sexto año, +2 días por cada cinco años de servicio'),
  (11, 15, 24, NULL),
  (16, 20, 26, NULL),
  (21, 25, 28, NULL),
  (26, 30, 30, NULL),
  (31, NULL, 32, 'Último tramo abierto');

INSERT INTO public.supuestos_financieros (clave, descripcion, valor, unidad, fuente, fecha_actualizacion)
VALUES
  ('dias_habiles_respuesta_solicitud', 'Días hábiles máximos para resolver una solicitud de tiempo', 3, 'días hábiles', 'Política interna de Escala', now()),
  ('prima_vacacional_pct', 'Prima vacacional mínima sobre los días de vacaciones', 25, '%', 'Ley Federal del Trabajo, artículo 80', now())
ON CONFLICT DO NOTHING;

-- Jornada: registro propio y consulta del líder directo
CREATE POLICY "jornada propia inserta" ON public.registros_jornada
  FOR INSERT TO authenticated
  WITH CHECK (colaborador_id = public.mi_colaborador_id());
CREATE POLICY "jornada propia consulta" ON public.registros_jornada
  FOR SELECT TO authenticated
  USING (colaborador_id = public.mi_colaborador_id());
CREATE POLICY "jornada del equipo directo" ON public.registros_jornada
  FOR SELECT TO authenticated
  USING (public.lidera(colaborador_id));

-- Dirección General no debe ver ubicación de jornada (LFPDPPP)
DROP POLICY IF EXISTS "direccion consulta" ON public.registros_jornada;

-- Saldos: el líder ve los de su equipo directo
CREATE POLICY "saldos del equipo directo" ON public.saldos_vacaciones
  FOR SELECT TO authenticated
  USING (public.lidera(colaborador_id));

-- Cobertura: el líder de proyecto ve ausencias aprobadas de su proyecto
CREATE POLICY "ausencias aprobadas del proyecto" ON public.solicitudes
  FOR SELECT TO authenticated
  USING (
    public.es('lider_proyecto')
    AND estatus = 'aprobada'
    AND EXISTS (
      SELECT 1 FROM public.colaboradores c
      JOIN public.proyectos p ON p.id = c.proyecto_actual_id
      WHERE c.id = solicitudes.colaborador_id
        AND p.director_id = public.mi_colaborador_id()
    )
  );

-- El colaborador corrige o cancela su solicitud mientras siga pendiente
CREATE POLICY "editar solicitud propia pendiente" ON public.solicitudes
  FOR UPDATE TO authenticated
  USING (colaborador_id = public.mi_colaborador_id() AND estatus = 'pendiente')
  WITH CHECK (colaborador_id = public.mi_colaborador_id());