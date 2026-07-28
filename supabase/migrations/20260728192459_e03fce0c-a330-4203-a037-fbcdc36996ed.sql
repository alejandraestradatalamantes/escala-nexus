
-- ============ ENUMS ============
CREATE TYPE public.rol_usuario AS ENUM ('direccion_talento','direccion_general','lider_proyecto','reclutamiento','colaborador','finanzas_auditoria','ti_sistema');
CREATE TYPE public.ubicacion_tipo AS ENUM ('corporativo','campo');
CREATE TYPE public.estatus_colaborador AS ENUM ('activo','baja','licencia');

-- ============ UTILS ============
CREATE OR REPLACE FUNCTION public.tg_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ PERFILES Y ROLES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL DEFAULT '',
  correo text,
  colaborador_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rol public.rol_usuario NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, rol)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.tiene_rol(_user_id uuid, _rol public.rol_usuario)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND rol = _rol);
$$;

CREATE OR REPLACE FUNCTION public.mis_roles()
RETURNS SETOF public.rol_usuario LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT rol FROM public.user_roles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.es(_rol public.rol_usuario)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND rol = _rol);
$$;

CREATE OR REPLACE FUNCTION public.mi_colaborador_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT colaborador_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE POLICY "perfil propio" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.es('direccion_talento') OR public.es('ti_sistema'));
CREATE POLICY "editar perfil propio" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "crear perfil propio" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "ver roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.es('direccion_talento') OR public.es('ti_sistema'));

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, correo)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email,'@',1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, rol) VALUES (NEW.id, 'colaborador') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ NUCLEO ============
CREATE TABLE public.puestos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL, familia text, nivel_organizacional text, area text,
  perfil_competencias jsonb NOT NULL DEFAULT '{}'::jsonb,
  es_demo boolean NOT NULL DEFAULT false,
  creado_por uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.proyectos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL, cliente text, ciudad text,
  fecha_inicio date, fecha_fin_plan date, estatus text NOT NULL DEFAULT 'activo',
  director_id uuid, id_externo_acc text,
  es_demo boolean NOT NULL DEFAULT false,
  creado_por uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.colaboradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL, correo text, fecha_ingreso date,
  puesto_id uuid REFERENCES public.puestos(id) ON DELETE SET NULL,
  area text,
  ubicacion public.ubicacion_tipo NOT NULL DEFAULT 'corporativo',
  proyecto_actual_id uuid REFERENCES public.proyectos(id) ON DELETE SET NULL,
  lider_id uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  estatus public.estatus_colaborador NOT NULL DEFAULT 'activo',
  foto_url text, tipo_contrato text, user_id uuid,
  es_demo boolean NOT NULL DEFAULT false,
  creado_por uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_colaborador_fk FOREIGN KEY (colaborador_id) REFERENCES public.colaboradores(id) ON DELETE SET NULL;
ALTER TABLE public.proyectos ADD CONSTRAINT proyectos_director_fk FOREIGN KEY (director_id) REFERENCES public.colaboradores(id) ON DELETE SET NULL;

CREATE TABLE public.documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  tipo text NOT NULL, url text, vigencia date, confidencial boolean NOT NULL DEFAULT false,
  es_demo boolean NOT NULL DEFAULT false,
  creado_por uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.certificaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  nombre text NOT NULL, organismo text, folio text,
  fecha_obtencion date, fecha_vencimiento date, costo numeric,
  patrocinada_por_escala boolean NOT NULL DEFAULT false,
  es_demo boolean NOT NULL DEFAULT false,
  creado_por uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ ATRACCION ============
CREATE TABLE public.fases_proceso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL, orden int NOT NULL DEFAULT 0, sla_dias int, tipo text, activa boolean NOT NULL DEFAULT true,
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.vacantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  puesto_id uuid REFERENCES public.puestos(id) ON DELETE SET NULL,
  proyecto_id uuid REFERENCES public.proyectos(id) ON DELETE SET NULL,
  estatus text NOT NULL DEFAULT 'abierta', fecha_apertura date, fecha_meta_cobertura date, fecha_cierre_real date,
  salario_min numeric, salario_max numeric,
  hiring_manager_id uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  motivo text, costo_vacante_dia numeric,
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.candidatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL, correo text, telefono text, fuente text, cv_url text,
  vacante_id uuid REFERENCES public.vacantes(id) ON DELETE CASCADE,
  fase_id uuid REFERENCES public.fases_proceso(id) ON DELETE SET NULL,
  fecha_ingreso_fase date, estatus text NOT NULL DEFAULT 'activo', motivo_descarte text,
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.movimientos_candidato (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id uuid NOT NULL REFERENCES public.candidatos(id) ON DELETE CASCADE,
  fase_origen uuid, fase_destino uuid, fecha timestamptz NOT NULL DEFAULT now(), dias_en_fase int, usuario_id uuid,
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.entrevistas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id uuid NOT NULL REFERENCES public.candidatos(id) ON DELETE CASCADE,
  entrevistador_id uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  tipo text, fecha timestamptz, estatus text NOT NULL DEFAULT 'programada', notas text,
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.ofertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id uuid NOT NULL REFERENCES public.candidatos(id) ON DELETE CASCADE,
  sueldo numeric, prestaciones text, fecha_envio date, fecha_respuesta date, estatus text NOT NULL DEFAULT 'borrador',
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ DESEMPENO / DESARROLLO ============
CREATE TABLE public.competencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo text, nombre text NOT NULL, descripcion text, orden int NOT NULL DEFAULT 0,
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.niveles_competencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia_id uuid NOT NULL REFERENCES public.competencias(id) ON DELETE CASCADE,
  nivel int NOT NULL, etiqueta text, descripcion text, resumen text,
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.comportamientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nivel_competencia_id uuid NOT NULL REFERENCES public.niveles_competencia(id) ON DELETE CASCADE,
  texto text NOT NULL, orden int NOT NULL DEFAULT 0,
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.ciclos_evaluacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL, tipo text, fecha_inicio date, fecha_fin date, estatus text NOT NULL DEFAULT 'borrador',
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.evaluaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ciclo_id uuid REFERENCES public.ciclos_evaluacion(id) ON DELETE CASCADE,
  colaborador_id uuid REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  evaluador_id uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  relacion text, estatus text NOT NULL DEFAULT 'pendiente',
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.evaluacion_competencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluacion_id uuid NOT NULL REFERENCES public.evaluaciones(id) ON DELETE CASCADE,
  competencia_id uuid REFERENCES public.competencias(id) ON DELETE SET NULL,
  nivel_observado int, evidencia text,
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.scorecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entrevista_id uuid NOT NULL REFERENCES public.entrevistas(id) ON DELETE CASCADE,
  competencia_id uuid REFERENCES public.competencias(id) ON DELETE SET NULL,
  calificacion int, evidencia_star text, recomendacion text,
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.objetivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  ciclo_id uuid REFERENCES public.ciclos_evaluacion(id) ON DELETE SET NULL,
  descripcion text, tipo text, peso numeric, meta numeric, real numeric, unidad text, estatus text NOT NULL DEFAULT 'activo',
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.mapeo_talento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  ciclo_id uuid REFERENCES public.ciclos_evaluacion(id) ON DELETE SET NULL,
  eje_desempeno int, eje_potencial int, casilla_9box int, acuerdos text,
  riesgo_salida text, criticidad_puesto text,
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.agendas_desarrollo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  ciclo text, estatus text NOT NULL DEFAULT 'borrador', fecha_autorizacion date, autorizada_por uuid, avance_pct numeric NOT NULL DEFAULT 0,
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.autorreflexion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_id uuid NOT NULL REFERENCES public.agendas_desarrollo(id) ON DELETE CASCADE,
  formacion jsonb DEFAULT '{}'::jsonb, movilidad jsonb DEFAULT '{}'::jsonb, expectativas_carrera jsonb DEFAULT '{}'::jsonb,
  fortalezas text[], areas_oportunidad text[], necesidades_actual text[], necesidades_futuro text[],
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.prioridades_desarrollo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_id uuid NOT NULL REFERENCES public.agendas_desarrollo(id) ON DELETE CASCADE,
  dimension text, competencia_id uuid REFERENCES public.competencias(id) ON DELETE SET NULL,
  descripcion text, nivel_actual int, nivel_meta int,
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.acciones_desarrollo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prioridad_id uuid NOT NULL REFERENCES public.prioridades_desarrollo(id) ON DELETE CASCADE,
  descripcion text, via_aprendizaje text, tipo_accion text, monto_inversion numeric,
  medicion_exito text, fecha_inicio date, fecha_fin date, estatus text NOT NULL DEFAULT 'planeada',
  ultima_actualizacion timestamptz, observaciones text,
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.medicion_efectividad (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prioridad_id uuid NOT NULL REFERENCES public.prioridades_desarrollo(id) ON DELETE CASCADE,
  comportamiento_id uuid REFERENCES public.comportamientos(id) ON DELETE SET NULL,
  autoevaluacion boolean, evaluacion_jefe boolean, comentarios text, fecha date,
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.sesiones_seguimiento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_id uuid NOT NULL REFERENCES public.agendas_desarrollo(id) ON DELETE CASCADE,
  fecha date, tipo text, acuerdos text, participantes text[],
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ TIEMPO ============
CREATE TABLE public.solicitudes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  tipo text NOT NULL, fecha_inicio date, fecha_fin date, dias numeric, motivo text,
  estatus text NOT NULL DEFAULT 'pendiente', aprobador_id uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  fecha_solicitud timestamptz NOT NULL DEFAULT now(), fecha_resolucion timestamptz, horas_ciclo numeric,
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.saldos_vacaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  anio_servicio int, dias_ley numeric NOT NULL DEFAULT 0, dias_adicionales numeric NOT NULL DEFAULT 0,
  dias_tomados numeric NOT NULL DEFAULT 0, dias_disponibles numeric NOT NULL DEFAULT 0,
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.registros_jornada (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  fecha date, tipo_registro text, proyecto_id uuid REFERENCES public.proyectos(id) ON DELETE SET NULL,
  geo_lat numeric, geo_lng numeric, precision_m numeric, origen text,
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ BIENESTAR ============
CREATE TABLE public.pulsos_animo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  fecha date NOT NULL DEFAULT current_date, valor int NOT NULL, comentario_opcional text,
  proyecto_id uuid REFERENCES public.proyectos(id) ON DELETE SET NULL,
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.encuestas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL, tipo text, fecha_inicio date, fecha_fin date, cobertura_objetivo numeric,
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.respuestas_encuesta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encuesta_id uuid NOT NULL REFERENCES public.encuestas(id) ON DELETE CASCADE,
  colaborador_hash text, reactivo_id text, valor numeric,
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.reconocimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  de_id uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  para_id uuid REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  valor_asociado text, mensaje text, fecha date NOT NULL DEFAULT current_date, publico boolean NOT NULL DEFAULT true,
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.comunicados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL, cuerpo text, audiencia text, fecha_publicacion timestamptz NOT NULL DEFAULT now(),
  autor_id uuid, lecturas int NOT NULL DEFAULT 0,
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ ANALITICA Y GOBIERNO ============
CREATE TABLE public.supuestos_financieros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clave text NOT NULL UNIQUE, descripcion text, valor numeric, unidad text, fuente text,
  fecha_actualizacion timestamptz, actualizado_por uuid,
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clave text NOT NULL UNIQUE, nombre text NOT NULL, formula_texto text, unidad text,
  sentido text NOT NULL DEFAULT 'mayorEsMejor', meta numeric, linea_base numeric, fecha_corte date,
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.mediciones_kpi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id uuid NOT NULL REFERENCES public.kpis(id) ON DELETE CASCADE,
  periodo text, valor numeric, calculado_en timestamptz NOT NULL DEFAULT now(),
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text, entidad text, entidad_id uuid, payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  procesado boolean NOT NULL DEFAULT false, fecha timestamptz NOT NULL DEFAULT now(),
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.ai_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea text, entrada jsonb, salida jsonb, modelo text, tokens int, usuario_id uuid,
  aprobado_por uuid, estatus text NOT NULL DEFAULT 'pendiente',
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.bitacora_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid, accion text, tabla text, registro_id uuid, antes jsonb, despues jsonb,
  fecha timestamptz NOT NULL DEFAULT now(),
  es_demo boolean NOT NULL DEFAULT false, creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ GRANTS + RLS GENERICO ============
DO $$
DECLARE t text;
  tablas text[] := ARRAY[
    'puestos','proyectos','colaboradores','documentos','certificaciones',
    'fases_proceso','vacantes','candidatos','movimientos_candidato','entrevistas','ofertas','scorecards',
    'competencias','niveles_competencia','comportamientos','ciclos_evaluacion','evaluaciones','evaluacion_competencias',
    'objetivos','mapeo_talento','agendas_desarrollo','autorreflexion','prioridades_desarrollo','acciones_desarrollo',
    'medicion_efectividad','sesiones_seguimiento','solicitudes','saldos_vacaciones','registros_jornada',
    'pulsos_animo','encuestas','respuestas_encuesta','reconocimientos','comunicados',
    'supuestos_financieros','kpis','mediciones_kpi','eventos','ai_runs','bitacora_auditoria'];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at()', 'tg_upd_'||t, t);
    -- Dirección de Talento administra todo
    EXECUTE format('CREATE POLICY "talento administra" ON public.%I FOR ALL TO authenticated USING (public.es(''direccion_talento'')) WITH CHECK (public.es(''direccion_talento''))', t);
    -- Dirección General consulta todo
    EXECUTE format('CREATE POLICY "direccion consulta" ON public.%I FOR SELECT TO authenticated USING (public.es(''direccion_general''))', t);
  END LOOP;
END $$;

-- Catálogos legibles por cualquier usuario autenticado
CREATE POLICY "catalogo legible" ON public.puestos FOR SELECT TO authenticated USING (true);
CREATE POLICY "catalogo legible" ON public.proyectos FOR SELECT TO authenticated USING (true);
CREATE POLICY "catalogo legible" ON public.competencias FOR SELECT TO authenticated USING (true);
CREATE POLICY "catalogo legible" ON public.niveles_competencia FOR SELECT TO authenticated USING (true);
CREATE POLICY "catalogo legible" ON public.comportamientos FOR SELECT TO authenticated USING (true);
CREATE POLICY "catalogo legible" ON public.fases_proceso FOR SELECT TO authenticated USING (true);
CREATE POLICY "catalogo legible" ON public.comunicados FOR SELECT TO authenticated USING (true);

-- Directorio: todo colaborador autenticado puede consultar el directorio
CREATE POLICY "directorio legible" ON public.colaboradores FOR SELECT TO authenticated USING (true);

-- Expediente propio
CREATE POLICY "documentos propios" ON public.documentos FOR SELECT TO authenticated
  USING (colaborador_id = public.mi_colaborador_id() AND confidencial = false);
CREATE POLICY "certificaciones propias" ON public.certificaciones FOR SELECT TO authenticated
  USING (colaborador_id = public.mi_colaborador_id());
CREATE POLICY "solicitudes propias" ON public.solicitudes FOR SELECT TO authenticated
  USING (colaborador_id = public.mi_colaborador_id());
CREATE POLICY "crear solicitud propia" ON public.solicitudes FOR INSERT TO authenticated
  WITH CHECK (colaborador_id = public.mi_colaborador_id());
CREATE POLICY "saldos propios" ON public.saldos_vacaciones FOR SELECT TO authenticated
  USING (colaborador_id = public.mi_colaborador_id());
CREATE POLICY "pulso propio" ON public.pulsos_animo FOR SELECT TO authenticated
  USING (colaborador_id = public.mi_colaborador_id());
CREATE POLICY "registrar pulso propio" ON public.pulsos_animo FOR INSERT TO authenticated
  WITH CHECK (colaborador_id = public.mi_colaborador_id());
CREATE POLICY "agenda propia" ON public.agendas_desarrollo FOR SELECT TO authenticated
  USING (colaborador_id = public.mi_colaborador_id());
CREATE POLICY "reconocimientos publicos" ON public.reconocimientos FOR SELECT TO authenticated
  USING (publico = true OR para_id = public.mi_colaborador_id() OR de_id = public.mi_colaborador_id());
CREATE POLICY "enviar reconocimiento" ON public.reconocimientos FOR INSERT TO authenticated
  WITH CHECK (de_id = public.mi_colaborador_id());

-- Líder de proyecto: su equipo directo
CREATE POLICY "equipo del lider" ON public.solicitudes FOR SELECT TO authenticated
  USING (public.es('lider_proyecto') AND EXISTS (
    SELECT 1 FROM public.colaboradores c WHERE c.id = solicitudes.colaborador_id AND c.lider_id = public.mi_colaborador_id()));
CREATE POLICY "resolver solicitud equipo" ON public.solicitudes FOR UPDATE TO authenticated
  USING (public.es('lider_proyecto') AND EXISTS (
    SELECT 1 FROM public.colaboradores c WHERE c.id = solicitudes.colaborador_id AND c.lider_id = public.mi_colaborador_id()))
  WITH CHECK (true);
CREATE POLICY "evaluaciones del lider" ON public.evaluaciones FOR ALL TO authenticated
  USING (public.es('lider_proyecto') AND EXISTS (
    SELECT 1 FROM public.colaboradores c WHERE c.id = evaluaciones.colaborador_id AND c.lider_id = public.mi_colaborador_id()))
  WITH CHECK (public.es('lider_proyecto'));

-- Reclutamiento: módulo de Atracción completo
DO $$
DECLARE t text; tablas text[] := ARRAY['vacantes','candidatos','movimientos_candidato','entrevistas','ofertas','scorecards','fases_proceso'];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('CREATE POLICY "reclutamiento administra" ON public.%I FOR ALL TO authenticated USING (public.es(''reclutamiento'')) WITH CHECK (public.es(''reclutamiento''))', t);
  END LOOP;
END $$;

-- Finanzas y auditoría: solo lectura de indicadores y supuestos (sin datos personales)
DO $$
DECLARE t text; tablas text[] := ARRAY['kpis','mediciones_kpi','supuestos_financieros'];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('CREATE POLICY "auditoria consulta" ON public.%I FOR SELECT TO authenticated USING (public.es(''finanzas_auditoria''))', t);
  END LOOP;
END $$;
CREATE POLICY "auditoria captura supuestos" ON public.supuestos_financieros FOR UPDATE TO authenticated
  USING (public.es('finanzas_auditoria')) WITH CHECK (public.es('finanzas_auditoria'));

-- TI: configuración, catálogos, bitácora (sin evaluaciones ni bienestar)
DO $$
DECLARE t text; tablas text[] := ARRAY['bitacora_auditoria','eventos','ai_runs','kpis','supuestos_financieros','puestos','proyectos','fases_proceso'];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('CREATE POLICY "ti_sistema administra" ON public.%I FOR ALL TO authenticated USING (public.es(''ti_sistema'')) WITH CHECK (public.es(''ti_sistema''))', t);
  END LOOP;
END $$;
