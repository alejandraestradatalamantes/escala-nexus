import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { fechaCorta } from "@/lib/nexus/formato";

interface Props {
  puedeEditar: boolean;
  usuarioId: string | null;
}

/**
 * Catálogo del artículo 76 de la LFT. Vive en base de datos, no en el código:
 * cuando la ley cambie, Dirección de Talento edita aquí y el sistema recalcula.
 */
export function CatalogoVacaciones({ puedeEditar, usuarioId }: Props) {
  const queryClient = useQueryClient();
  const [edicion, setEdicion] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["catalogo-vacaciones"],
    retry: 3,
    queryFn: async () =>
      (await supabase.from("catalogo_vacaciones_lft").select("*").order("anios_min")).data ?? [],
  });

  const guardar = useMutation({
    mutationFn: async ({ id, antes, dias }: { id: string; antes: number; dias: string }) => {
      const numerico = Number(dias);
      if (!Number.isFinite(numerico) || numerico < 0) throw new Error("valor inválido");
      const { error } = await supabase
        .from("catalogo_vacaciones_lft")
        .update({ dias_ley: numerico })
        .eq("id", id);
      if (error) throw error;
      await supabase.from("bitacora_auditoria").insert({
        usuario_id: usuarioId,
        accion: "Actualizó el catálogo de vacaciones del artículo 76",
        tabla: "catalogo_vacaciones_lft",
        registro_id: id,
        antes: { dias_ley: antes } as never,
        despues: { dias_ley: numerico } as never,
      });
      return id;
    },
    onSuccess: (id) => {
      toast.success("Catálogo actualizado y registrado en la bitácora");
      setEdicion((e) => {
        const copia = { ...e };
        delete copia[id];
        return copia;
      });
      queryClient.invalidateQueries({ queryKey: ["catalogo-vacaciones"] });
      queryClient.invalidateQueries({ queryKey: ["tiempo-mis-solicitudes"] });
    },
    onError: () =>
      toast.error("No se guardó el tramo. Captura un número válido; solo Talento o TI pueden."),
  });

  return (
    <section className="border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-cota">
            Vacaciones — catálogo del artículo 76 LFT
          </h2>
          <p className="mt-1 max-w-2xl text-[13px] text-cota">
            {puedeEditar
              ? "Los días de ley por año de servicio viven aquí, no en el código. Al cambiar la ley, edita el tramo y el sistema recalcula los saldos nuevos."
              : "Solo Dirección de Talento y TI pueden editar el catálogo. Los días de ley se aplican a todos los saldos."}
          </p>
        </div>
        <span className="cifra shrink-0 bg-casco/15 px-2 py-1 text-[11px] uppercase tracking-wide text-grafito">
          Reforma 2023
        </span>
      </div>

      {isLoading ? (
        <div className="mt-3 space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-none" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <p className="mt-2 text-[13px] text-cota">El catálogo está vacío.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead className="bg-grafito text-cal">
              <tr>
                {["Años de servicio", "Días de ley", "Fuente", "Vigente desde", ""].map((h) => (
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
              {data.map((t) => {
                const borrador = edicion[t.id];
                return (
                  <tr key={t.id} className="border-t border-border hover:bg-cal">
                    <td className="cifra px-3 py-2 text-grafito">
                      {t.anios_max === null
                        ? `${t.anios_min} o más`
                        : t.anios_min === t.anios_max
                          ? `${t.anios_min}`
                          : `${t.anios_min} a ${t.anios_max}`}
                    </td>
                    <td className="px-3 py-2">
                      {borrador !== undefined ? (
                        <Input
                          value={borrador}
                          inputMode="numeric"
                          aria-label={`Días de ley del tramo ${t.anios_min}`}
                          onChange={(e) =>
                            setEdicion((prev) => ({ ...prev, [t.id]: e.target.value }))
                          }
                          className="cifra h-10 w-24 rounded-none"
                        />
                      ) : (
                        <span className="cifra text-grafito">{t.dias_ley}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-cota">{t.fuente}</td>
                    <td className="cifra px-3 py-2 text-cota">{fechaCorta(t.vigente_desde)}</td>
                    <td className="px-3 py-2 text-right">
                      {!puedeEditar ? null : borrador !== undefined ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            disabled={guardar.isPending}
                            onClick={() =>
                              guardar.mutate({ id: t.id, antes: t.dias_ley, dias: borrador })
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
                                delete copia[t.id];
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
                            setEdicion((prev) => ({ ...prev, [t.id]: String(t.dias_ley) }))
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
      <p className="mt-3 border-t border-border pt-2 text-[11px] text-cota">
        Editar el catálogo no reescribe saldos ya calculados: aplica a los saldos que se generen
        después del cambio. Cada edición queda en la bitácora de auditoría.
      </p>
    </section>
  );
}