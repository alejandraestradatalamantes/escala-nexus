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

/**
 * Vinculación automática por correo: si el perfil no tiene expediente y existe
 * exactamente un colaborador activo con el mismo correo, se vincula y se registra
 * en la bitácora. Con cero o más de una coincidencia no se adivina.
 */
async function vincularPorCorreo(userId: string, correo: string): Promise<string | null> {
  const limpio = correo.trim();
  if (!limpio) return null;
  const { data: candidatos, error } = await supabase
    .from("colaboradores")
    .select("id, nombre, correo")
    .ilike("correo", limpio)
    .eq("estatus", "activo")
    .limit(2);
  if (error || !candidatos || candidatos.length !== 1) return null;
  const colaborador = candidatos[0];
  const { error: errorVinculo } = await supabase
    .from("profiles")
    .update({ colaborador_id: colaborador.id })
    .eq("id", userId);
  if (errorVinculo) return null;
  await supabase.from("bitacora_auditoria").insert({
    usuario_id: userId,
    accion: "Vinculación automática por correo",
    tabla: "profiles",
    registro_id: userId,
    antes: { colaborador_id: null } as never,
    despues: { colaborador_id: colaborador.id, correo: colaborador.correo } as never,
  });
  return colaborador.id;
}

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
      let colaboradorId = perfil?.colaborador_id ?? null;
      if (!colaboradorId) {
        colaboradorId = await vincularPorCorreo(user.id, perfil?.correo ?? user.email ?? "");
      }
      return {
        userId: user.id,
        correo: user.email ?? "",
        nombre: perfil?.nombre || user.email?.split("@")[0] || "Colaborador",
        colaboradorId,
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