CREATE POLICY "talento vincula expedientes"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.es('direccion_talento') OR public.es('direccion_general') OR public.es('ti_sistema'))
WITH CHECK (public.es('direccion_talento') OR public.es('direccion_general') OR public.es('ti_sistema'));

CREATE POLICY "direccion consulta perfiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.es('direccion_general'));

DROP FUNCTION IF EXISTS public.listar_usuarios();

CREATE OR REPLACE FUNCTION public.listar_usuarios()
RETURNS TABLE(id uuid, nombre text, correo text, colaborador_id uuid, roles rol_usuario[])
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.id, p.nombre, p.correo, p.colaborador_id,
    COALESCE(array_agg(ur.rol) FILTER (WHERE ur.rol IS NOT NULL), '{}')
  FROM public.profiles p LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE public.es('direccion_talento') OR public.es('ti_sistema') OR public.es('direccion_general')
  GROUP BY p.id, p.nombre, p.correo, p.colaborador_id ORDER BY p.nombre;
$function$;