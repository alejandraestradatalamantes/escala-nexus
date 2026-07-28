
DROP POLICY "resolver solicitud equipo" ON public.solicitudes;
CREATE POLICY "resolver solicitud equipo" ON public.solicitudes FOR UPDATE TO authenticated
  USING (public.es('lider_proyecto') AND EXISTS (
    SELECT 1 FROM public.colaboradores c WHERE c.id = solicitudes.colaborador_id AND c.lider_id = public.mi_colaborador_id()))
  WITH CHECK (public.es('lider_proyecto') AND EXISTS (
    SELECT 1 FROM public.colaboradores c WHERE c.id = solicitudes.colaborador_id AND c.lider_id = public.mi_colaborador_id()));

REVOKE EXECUTE ON FUNCTION public.es(public.rol_usuario) FROM anon;
REVOKE EXECUTE ON FUNCTION public.tiene_rol(uuid, public.rol_usuario) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mis_roles() FROM anon;
REVOKE EXECUTE ON FUNCTION public.mi_colaborador_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_updated_at() FROM anon, authenticated;
