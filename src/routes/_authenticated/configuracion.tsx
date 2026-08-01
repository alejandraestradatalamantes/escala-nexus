import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useSesion, type Rol } from "@/hooks/use-sesion";
import { ETIQUETA_ROL, ROLES, fechaCorta } from "@/lib/nexus/formato";
import { ImportarComportamientos } from "@/components/nexus/desempeno/importar-comportamientos";
import { UsuariosAccesos } from "@/components/nexus/configuracion/usuarios-accesos";
import { CatalogoVacaciones } from "@/components/nexus/configuracion/catalogo-vacaciones";
import { CatalogoValores } from "@/components/nexus/configuracion/catalogo-valores";
import { UmbralAgregacion } from "@/components/nexus/configuracion/umbral-agregacion";
import { GruposReporte } from "@/components/nexus/configuracion/grupos-reporte";
import { useUmbralAgregacion } from "@/hooks/use-umbral";
import { toast } from "sonner";

const ETIQUETA_SUPUESTO: Record<string, string> = {
  costo_vacante_dia: "Costo por día de vacancia",
  costo_hora_promedio: "Costo promedio por hora",
  costo_rotacion_pct: "Costo de rotación",
  inversion_desarrollo_anual: "Inversión anual en desarrollo",
  plantilla_autorizada: "Plantilla autorizada",
};

export const Route = createFileRoute("/_authenticated/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración — ESCALA Nexus" },
      {
        name: "description",
        content: "Roles, permisos y supuestos financieros del sistema de talento de Escala.",
      },
      { property: "og:title", content: "Configuración — ESCALA Nexus" },
      { property: "og:description", content: "Administración de roles y supuestos en Nexus." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Configuracion,
});

function Configuracion() {
  const { sesion, roles, tiene } = useSesion();
  const { umbral } = useUmbralAgregacion();
  const admin = tiene("direccion_talento", "ti_sistema");
  const puedeUmbral = tiene("direccion_talento", "direccion_general");
  const esTalento = tiene("direccion_talento");
  const veAccesos = tiene("direccion_talento", "direccion_general", "ti_sistema");
  const puedeCapturar = tiene("direccion_talento", "direccion_general", "finanzas_auditoria");
  const queryClient = useQueryClient();
  const [edicion, setEdicion] = useState<Record<string, { valor: string; fuente: string }>>({});

  const { data: supuestos, isLoading: cargandoSupuestos } = useQuery({
    queryKey: ["supuestos"],
    retry: 3,
    queryFn: async () =>
      (await supabase.from("supuestos_financieros").select("*").order("clave")).data ?? [],
  });

  const guardarSupuesto = useMutation({
    mutationFn: async ({
      id,
      clave,
      antes,
      valor,
      fuente,
    }: {
      id: string;
      clave: string;
      antes: { valor: number | null; fuente: string | null };
      valor: string;
      fuente: string;
    }) => {
      const numerico = valor.trim() === "" ? null : Number(valor);
      if (numerico !== null && Number.isNaN(numerico)) throw new Error("valor no numérico");
      const despues = {
        valor: numerico,
        fuente: fuente.trim() || null,
        fecha_actualizacion: new Date().toISOString(),
        actualizado_por: sesion?.userId ?? null,
      };
      const { error } = await supabase.from("supuestos_financieros").update(despues).eq("id", id);
      if (error) throw error;
      await supabase.from("bitacora_auditoria").insert({
        usuario_id: sesion?.userId ?? null,
        accion: `Actualizó el supuesto ${clave}`,
        tabla: "supuestos_financieros",
        registro_id: id,
        antes,
        despues,
      });
      return clave;
    },
    onSuccess: (clave) => {
      toast.success("Supuesto actualizado y registrado en la bitácora");
      setEdicion((e) => {
        const copia = { ...e };
        delete copia[clave];
        return copia;
      });
      queryClient.invalidateQueries({ queryKey: ["supuestos"] });
      queryClient.invalidateQueries({ queryKey: ["tablero-indicadores"] });
    },
    onError: () =>
      toast.error(
        "No se guardó el supuesto. Captura un número válido y verifica que tengas rol de Dirección o Finanzas.",
      ),
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
    onError: () =>
      toast.error("No se pudo cambiar el rol. Solo Dirección de Talento o TI pueden hacerlo."),
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
                <span className="min-w-0 truncate text-[13px] text-grafito">
                  {ETIQUETA_ROL[rol]}
                </span>
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
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-cota">
          Supuestos financieros
        </h2>
        <p className="mt-1 text-[13px] text-cota">
          {puedeCapturar
            ? "Captura el valor y la fuente. Cada cambio queda registrado en la bitácora de auditoría."
            : "Solo Dirección de Talento, Dirección General y Finanzas y Auditoría pueden capturar estos valores."}
        </p>
        {cargandoSupuestos ? (
          <div className="mt-3 space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-none" />
            ))}
          </div>
        ) : !supuestos || supuestos.length === 0 ? (
          <p className="mt-2 text-[13px] text-cota">Aún no hay supuestos capturados.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className="bg-grafito text-cal">
                <tr>
                  {["Supuesto", "Valor", "Fuente", "Actualizado", ""].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {supuestos.map((s) => {
                  const borrador = edicion[s.clave];
                  const editando = borrador !== undefined;
                  return (
                    <tr key={s.id} className="border-t border-border align-top">
                      <td className="h-10 px-3 py-2">
                        <span className="text-grafito">
                          {ETIQUETA_SUPUESTO[s.clave] ?? s.clave}
                        </span>
                        <span className="cifra block text-[11px] text-cota">{s.clave}</span>
                      </td>
                      <td className="px-3 py-2">
                        {editando ? (
                          <Input
                            value={borrador.valor}
                            inputMode="decimal"
                            aria-label={`Valor de ${s.clave}`}
                            onChange={(e) =>
                              setEdicion((prev) => ({
                                ...prev,
                                [s.clave]: { ...prev[s.clave], valor: e.target.value },
                              }))
                            }
                            className="cifra h-10 w-32 rounded-none"
                          />
                        ) : (
                          <span className="cifra">
                            {s.valor ?? "[Dato Requerido de Escala]"}
                            {s.valor !== null && s.unidad ? ` ${s.unidad}` : ""}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editando ? (
                          <Input
                            value={borrador.fuente}
                            aria-label={`Fuente de ${s.clave}`}
                            onChange={(e) =>
                              setEdicion((prev) => ({
                                ...prev,
                                [s.clave]: { ...prev[s.clave], fuente: e.target.value },
                              }))
                            }
                            className="h-10 w-56 rounded-none"
                          />
                        ) : (
                          <span className="text-cota">{s.fuente ?? "—"}</span>
                        )}
                      </td>
                      <td className="cifra px-3 py-2 text-cota">
                        {fechaCorta(s.fecha_actualizacion)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {!puedeCapturar ? null : editando ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              disabled={guardarSupuesto.isPending}
                              onClick={() =>
                                guardarSupuesto.mutate({
                                  id: s.id,
                                  clave: s.clave,
                                  antes: { valor: s.valor, fuente: s.fuente },
                                  valor: borrador.valor,
                                  fuente: borrador.fuente,
                                })
                              }
                              className="h-9 rounded-none text-[12px]"
                            >
                              Guardar
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() =>
                                setEdicion((prev) => {
                                  const copia = { ...prev };
                                  delete copia[s.clave];
                                  return copia;
                                })
                              }
                              className="h-9 rounded-none text-[12px]"
                            >
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() =>
                              setEdicion((prev) => ({
                                ...prev,
                                [s.clave]: {
                                  valor: s.valor === null ? "" : String(s.valor),
                                  fuente: s.fuente ?? "",
                                },
                              }))
                            }
                            className="h-9 rounded-none text-[12px]"
                          >
                            Editar
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <CatalogoVacaciones puedeEditar={admin} usuarioId={sesion?.userId ?? null} />

      <CatalogoValores puedeEditar={esTalento} usuarioId={sesion?.userId ?? null} />

      <UmbralAgregacion puedeEditar={puedeUmbral} usuarioId={sesion?.userId ?? null} />

      <GruposReporte puedeEditar={esTalento} usuarioId={sesion?.userId ?? null} />

      <section className="border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-cota">
              Control de confidencialidad de evaluaciones
            </h2>
            <p className="mt-1 max-w-2xl text-[13px] text-cota">
              Los resultados individuales de evaluación solo son accesibles para el colaborador, su
              líder directo y Dirección de Talento. Las vistas agregadas de Bienestar requieren un
              mínimo de {umbral} personas para desplegarse.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-1">
            <span className="cifra bg-casco/15 px-2 py-1 text-[11px] uppercase tracking-wide text-grafito">
              Requiere visto bueno de Jurídico
            </span>
            <span className="cifra text-[11px] uppercase tracking-wide text-cota">
              Estatus pendiente
            </span>
          </div>
        </div>
      </section>

      {veAccesos ? <UsuariosAccesos usuarioId={sesion?.userId ?? null} /> : null}

      {esTalento ? <ImportarComportamientos /> : null}
    </div>
  );
}
