import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useSesion, type Rol } from "@/hooks/use-sesion";
import { ETIQUETA_ROL, ROLES, fechaCorta } from "@/lib/nexus/formato";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración — ESCALA Nexus" },
      { name: "description", content: "Roles, permisos y supuestos financieros del sistema de talento de Escala." },
      { property: "og:title", content: "Configuración — ESCALA Nexus" },
      { property: "og:description", content: "Administración de roles y supuestos en Nexus." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Configuracion,
});

function Configuracion() {
  const { sesion, roles, tiene } = useSesion();
  const admin = tiene("direccion_talento", "ti_sistema");
  const queryClient = useQueryClient();

  const { data: supuestos } = useQuery({
    queryKey: ["supuestos"],
    queryFn: async () =>
      (await supabase.from("supuestos_financieros").select("*").order("clave")).data ?? [],
  });

  const alternar = useMutation({
    mutationFn: async ({ rol, activo }: { rol: Rol; activo: boolean }) => {
      if (!sesion) return;
      const { error } = activo
        ? await supabase.from("user_roles").delete().eq("user_id", sesion.userId).eq("rol", rol)
        : await supabase.from("user_roles").insert({ user_id: sesion.userId, rol });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Roles actualizados");
      queryClient.invalidateQueries({ queryKey: ["sesion"] });
    },
    onError: () => toast.error("No se pudo cambiar el rol. Solo Dirección de Talento o TI pueden hacerlo."),
  });

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl text-grafito">Configuración</h1>
        <p className="mt-1 text-[13px] text-cota">
          Roles del sistema y supuestos que alimentan las líneas base de los indicadores.
        </p>
      </header>

      <section className="border border-border bg-card p-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-cota">Mis roles</h2>
        <p className="mt-1 text-[13px] text-cota">
          {admin
            ? "Puedes activar y desactivar tus propios roles para probar cada perspectiva del sistema."
            : "Solo Dirección de Talento o TI pueden modificar roles."}
        </p>
        <ul className="mt-3 divide-y divide-border">
          {ROLES.map((rol) => {
            const activo = roles.includes(rol as Rol);
            return (
              <li key={rol} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2">
                <span className="min-w-0 truncate text-[13px] text-grafito">{ETIQUETA_ROL[rol]}</span>
                <Button
                  variant={activo ? "default" : "outline"}
                  disabled={!admin || alternar.isPending}
                  onClick={() => alternar.mutate({ rol: rol as Rol, activo })}
                  className="h-9 shrink-0 rounded-none text-[12px]"
                >
                  {activo ? "Activo" : "Inactivo"}
                </Button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="border border-border bg-card p-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-cota">Supuestos financieros</h2>
        {!supuestos || supuestos.length === 0 ? (
          <p className="mt-2 text-[13px] text-cota">Aún no hay supuestos capturados.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead className="bg-grafito text-cal">
                <tr>
                  {["Clave", "Valor", "Fuente", "Actualizado"].map((h) => (
                    <th key={h} className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {supuestos.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="cifra h-10 px-3">{s.clave}</td>
                    <td className="cifra px-3">
                      {s.valor ?? "[Dato Requerido de Escala]"}
                      {s.valor !== null && s.unidad ? ` ${s.unidad}` : ""}
                    </td>
                    <td className="px-3 text-cota">{s.fuente ?? "—"}</td>
                    <td className="cifra px-3 text-cota">{fechaCorta(s.fecha_actualizacion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}