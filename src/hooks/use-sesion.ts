import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Rol =
  | "direccion_talento"
  | "direccion_general"
  | "lider_proyecto"
  | "reclutamiento"
  | "colaborador"
  | "finanzas_auditoria"
  | "ti_sistema";

export function useSesion() {
  const { data, isLoading } = useQuery({
    queryKey: ["sesion"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;
      const [{ data: roles }, { data: perfil }] = await Promise.all([
        supabase.from("user_roles").select("rol").eq("user_id", user.id),
        supabase.from("profiles").select("nombre, correo, colaborador_id").eq("id", user.id).maybeSingle(),
      ]);
      return {
        userId: user.id,
        correo: user.email ?? "",
        nombre: perfil?.nombre || user.email?.split("@")[0] || "Colaborador",
        colaboradorId: perfil?.colaborador_id ?? null,
        roles: (roles ?? []).map((r) => r.rol as Rol),
      };
    },
  });

  const roles = data?.roles ?? [];
  return {
    sesion: data ?? null,
    cargando: isLoading,
    roles,
    tiene: (...r: Rol[]) => r.some((x) => roles.includes(x)),
  };
}