
GRANT INSERT, DELETE ON public.user_roles TO authenticated;
CREATE POLICY "talento asigna roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.es('direccion_talento'));
CREATE POLICY "talento retira roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.es('direccion_talento'));
CREATE POLICY "talento consulta roles" ON public.user_roles FOR SELECT TO authenticated
  USING (public.es('direccion_talento'));

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE es_primero boolean;
BEGIN
  INSERT INTO public.profiles (id, nombre, correo)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email,'@',1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO es_primero;
  INSERT INTO public.user_roles (user_id, rol)
  VALUES (NEW.id, CASE WHEN es_primero THEN 'direccion_talento'::public.rol_usuario ELSE 'colaborador'::public.rol_usuario END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.listar_usuarios()
RETURNS TABLE (id uuid, nombre text, correo text, roles public.rol_usuario[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.nombre, p.correo,
    COALESCE(array_agg(ur.rol) FILTER (WHERE ur.rol IS NOT NULL), '{}')
  FROM public.profiles p LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE public.es('direccion_talento') OR public.es('ti_sistema')
  GROUP BY p.id, p.nombre, p.correo ORDER BY p.nombre;
$$;
REVOKE EXECUTE ON FUNCTION public.listar_usuarios() FROM anon;
