-- evaluaciones: el evaluador lee y responde las suyas
CREATE POLICY "evaluador responde" ON public.evaluaciones
  FOR SELECT TO authenticated
  USING (evaluador_id = public.mi_colaborador_id());

CREATE POLICY "evaluador actualiza" ON public.evaluaciones
  FOR UPDATE TO authenticated
  USING (evaluador_id = public.mi_colaborador_id())
  WITH CHECK (evaluador_id = public.mi_colaborador_id());

-- evaluaciones: el evaluado lee las suyas cuando el ciclo está cerrado
CREATE POLICY "evaluado consulta ciclo cerrado" ON public.evaluaciones
  FOR SELECT TO authenticated
  USING (
    colaborador_id = public.mi_colaborador_id()
    AND EXISTS (
      SELECT 1 FROM public.ciclos_evaluacion ce
      WHERE ce.id = evaluaciones.ciclo_id AND ce.estatus = 'cerrado'
    )
  );

-- evaluacion_competencias: escritura del evaluador dueño de la evaluación padre
CREATE POLICY "evaluador captura competencias" ON public.evaluacion_competencias
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.evaluaciones e
      WHERE e.id = evaluacion_competencias.evaluacion_id
        AND e.evaluador_id = public.mi_colaborador_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.evaluaciones e
      WHERE e.id = evaluacion_competencias.evaluacion_id
        AND e.evaluador_id = public.mi_colaborador_id()
    )
  );

-- evaluacion_competencias: lectura del líder directo del evaluado
CREATE POLICY "lider consulta competencias de su equipo" ON public.evaluacion_competencias
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.evaluaciones e
      JOIN public.colaboradores c ON c.id = e.colaborador_id
      WHERE e.id = evaluacion_competencias.evaluacion_id
        AND c.lider_id = public.mi_colaborador_id()
    )
  );

-- evaluacion_competencias: lectura del evaluado con ciclo cerrado
CREATE POLICY "evaluado consulta competencias ciclo cerrado" ON public.evaluacion_competencias
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.evaluaciones e
      JOIN public.ciclos_evaluacion ce ON ce.id = e.ciclo_id
      WHERE e.id = evaluacion_competencias.evaluacion_id
        AND e.colaborador_id = public.mi_colaborador_id()
        AND ce.estatus = 'cerrado'
    )
  );

-- objetivos: el colaborador lee los suyos
CREATE POLICY "colaborador consulta sus objetivos" ON public.objetivos
  FOR SELECT TO authenticated
  USING (colaborador_id = public.mi_colaborador_id());

-- objetivos: el líder lee y escribe los de su equipo directo
CREATE POLICY "lider administra objetivos de su equipo" ON public.objetivos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = objetivos.colaborador_id AND c.lider_id = public.mi_colaborador_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = objetivos.colaborador_id AND c.lider_id = public.mi_colaborador_id()
    )
  );

-- mapeo_talento: lectura del líder de proyecto sobre su equipo directo
CREATE POLICY "lider consulta mapeo de su equipo" ON public.mapeo_talento
  FOR SELECT TO authenticated
  USING (
    public.es('lider_proyecto')
    AND EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = mapeo_talento.colaborador_id AND c.lider_id = public.mi_colaborador_id()
    )
  );
