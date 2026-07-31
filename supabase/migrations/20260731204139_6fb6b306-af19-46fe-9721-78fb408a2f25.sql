-- 1. Firmas separadas de autorización
ALTER TABLE public.agendas_desarrollo
  ADD COLUMN IF NOT EXISTS vb_lider_por uuid,
  ADD COLUMN IF NOT EXISTS vb_lider_en timestamptz,
  ADD COLUMN IF NOT EXISTS vb_talento_por uuid,
  ADD COLUMN IF NOT EXISTS vb_talento_en timestamptz;

-- 2. Funciones de apoyo (security definer, sin recursión de RLS)
CREATE OR REPLACE FUNCTION public.lidera(_colab uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = _colab AND c.lider_id = public.mi_colaborador_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.puede_ver_agenda(_agenda uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agendas_desarrollo a
    WHERE a.id = _agenda
      AND (
        a.colaborador_id = public.mi_colaborador_id()
        OR public.lidera(a.colaborador_id)
        OR public.es('direccion_talento') OR public.es('direccion_general')
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.puede_editar_agenda(_agenda uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agendas_desarrollo a
    WHERE a.id = _agenda
      AND (
        public.es('direccion_talento')
        OR public.lidera(a.colaborador_id)
        OR (a.colaborador_id = public.mi_colaborador_id() AND a.estatus <> 'autorizada')
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.agenda_de_prioridad(_prioridad uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT agenda_id FROM public.prioridades_desarrollo WHERE id = _prioridad;
$$;

-- 3. AGENDAS
DROP POLICY IF EXISTS "agenda equipo lectura" ON public.agendas_desarrollo;
CREATE POLICY "agenda equipo lectura" ON public.agendas_desarrollo
  FOR SELECT TO authenticated USING (public.lidera(colaborador_id) OR public.es('finanzas_auditoria'));

DROP POLICY IF EXISTS "agenda propia alta" ON public.agendas_desarrollo;
CREATE POLICY "agenda propia alta" ON public.agendas_desarrollo
  FOR INSERT TO authenticated
  WITH CHECK (colaborador_id = public.mi_colaborador_id() OR public.lidera(colaborador_id));

DROP POLICY IF EXISTS "agenda propia edicion" ON public.agendas_desarrollo;
CREATE POLICY "agenda propia edicion" ON public.agendas_desarrollo
  FOR UPDATE TO authenticated
  USING (
    public.lidera(colaborador_id)
    OR (colaborador_id = public.mi_colaborador_id() AND estatus <> 'autorizada')
  )
  WITH CHECK (public.lidera(colaborador_id) OR colaborador_id = public.mi_colaborador_id());

-- 4. AUTORREFLEXIÓN (sin finanzas)
DROP POLICY IF EXISTS "autorreflexion lectura" ON public.autorreflexion;
CREATE POLICY "autorreflexion lectura" ON public.autorreflexion
  FOR SELECT TO authenticated USING (public.puede_ver_agenda(agenda_id));

DROP POLICY IF EXISTS "autorreflexion escritura" ON public.autorreflexion;
CREATE POLICY "autorreflexion escritura" ON public.autorreflexion
  FOR ALL TO authenticated
  USING (public.puede_editar_agenda(agenda_id))
  WITH CHECK (public.puede_editar_agenda(agenda_id));

-- 5. PRIORIDADES
DROP POLICY IF EXISTS "prioridades lectura" ON public.prioridades_desarrollo;
CREATE POLICY "prioridades lectura" ON public.prioridades_desarrollo
  FOR SELECT TO authenticated
  USING (public.puede_ver_agenda(agenda_id) OR public.es('finanzas_auditoria'));

DROP POLICY IF EXISTS "prioridades escritura" ON public.prioridades_desarrollo;
CREATE POLICY "prioridades escritura" ON public.prioridades_desarrollo
  FOR ALL TO authenticated
  USING (public.puede_editar_agenda(agenda_id))
  WITH CHECK (public.puede_editar_agenda(agenda_id));

-- 6. ACCIONES
DROP POLICY IF EXISTS "acciones lectura" ON public.acciones_desarrollo;
CREATE POLICY "acciones lectura" ON public.acciones_desarrollo
  FOR SELECT TO authenticated
  USING (
    public.puede_ver_agenda(public.agenda_de_prioridad(prioridad_id))
    OR public.es('finanzas_auditoria')
  );

DROP POLICY IF EXISTS "acciones escritura" ON public.acciones_desarrollo;
CREATE POLICY "acciones escritura" ON public.acciones_desarrollo
  FOR ALL TO authenticated
  USING (public.puede_editar_agenda(public.agenda_de_prioridad(prioridad_id)))
  WITH CHECK (public.puede_editar_agenda(public.agenda_de_prioridad(prioridad_id)));

-- 7. SESIONES DE SEGUIMIENTO
DROP POLICY IF EXISTS "sesiones lectura" ON public.sesiones_seguimiento;
CREATE POLICY "sesiones lectura" ON public.sesiones_seguimiento
  FOR SELECT TO authenticated USING (public.puede_ver_agenda(agenda_id));

DROP POLICY IF EXISTS "sesiones escritura" ON public.sesiones_seguimiento;
CREATE POLICY "sesiones escritura" ON public.sesiones_seguimiento
  FOR ALL TO authenticated
  USING (public.puede_editar_agenda(agenda_id))
  WITH CHECK (public.puede_editar_agenda(agenda_id));

-- 8. MEDICIÓN DE EFECTIVIDAD
DROP POLICY IF EXISTS "medicion lectura" ON public.medicion_efectividad;
CREATE POLICY "medicion lectura" ON public.medicion_efectividad
  FOR SELECT TO authenticated
  USING (public.puede_ver_agenda(public.agenda_de_prioridad(prioridad_id)));

DROP POLICY IF EXISTS "medicion escritura" ON public.medicion_efectividad;
CREATE POLICY "medicion escritura" ON public.medicion_efectividad
  FOR ALL TO authenticated
  USING (public.puede_editar_agenda(public.agenda_de_prioridad(prioridad_id)))
  WITH CHECK (public.puede_editar_agenda(public.agenda_de_prioridad(prioridad_id)));

-- 9. CERTIFICACIONES: líder ve a su equipo; finanzas consulta montos
DROP POLICY IF EXISTS "certificaciones equipo y finanzas" ON public.certificaciones;
CREATE POLICY "certificaciones equipo y finanzas" ON public.certificaciones
  FOR SELECT TO authenticated
  USING (public.lidera(colaborador_id) OR public.es('finanzas_auditoria'));