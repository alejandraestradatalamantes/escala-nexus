import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SelectorBuscador } from "@/components/nexus/selector-buscador";
import { ETIQUETA_ROL } from "@/lib/nexus/formato";

interface Props {
  usuarioId: string | null;
}

/** Vinculación manual entre cuentas de acceso y expedientes de colaborador. */
export function UsuariosAccesos({ usuarioId }: Props) {
  const queryClient = useQueryClient();
  const [porDesvincular, setPorDesvincular] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["usuarios-accesos"],
    retry: 3,
    queryFn: async () => {
      const [usuarios, colaboradores] = await Promise.all([
        supabase.rpc("listar_usuarios"),
        supabase
          .from("colaboradores")
          .select("id, nombre, correo, area, estatus")
          .eq("estatus", "activo")
          .order("nombre"),
      ]);
      return {
        usuarios: usuarios.data ?? [],
        colaboradores: colaboradores.data ?? [],
      };
    },
  });

  const opciones = useMemo(
    () =>
      (data?.colaboradores ?? []).map((c) => ({
        valor: c.id,
        etiqueta: c.nombre,
        detalle: c.area ?? undefined,
      })),
    [data?.colaboradores],
  );

  const nombreDe = (id: string | null) =>
    (data?.colaboradores ?? []).find((c) => c.id === id)?.nombre ?? null;

  const vincular = useMutation({
    mutationFn: async ({
      perfilId,
      antes,
      despues,
    }: {
      perfilId: string;
      antes: string | null;
      despues: string | null;
    }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ colaborador_id: despues })
        .eq("id", perfilId);
      if (error) throw error;
      await supabase.from("bitacora_auditoria").insert({
        usuario_id: usuarioId,
        accion: despues
          ? "Vinculó una cuenta de acceso con un expediente de colaborador"
          : "Desvinculó una cuenta de acceso de su expediente de colaborador",
        tabla: "profiles",
        registro_id: perfilId,
        antes: { colaborador_id: antes } as never,
        despues: { colaborador_id: despues } as never,
      });
    },
    onSuccess: () => {
      toast.success("Vinculación actualizada y registrada en la bitácora");
      setPorDesvincular(null);
      queryClient.invalidateQueries({ queryKey: ["usuarios-accesos"] });
      queryClient.invalidateQueries({ queryKey: ["sesion"] });
    },
    onError: () =>
      toast.error("No se pudo actualizar la vinculación. Requiere rol de Dirección o TI."),
  });

  const usuarioADesvincular = (data?.usuarios ?? []).find((u) => u.id === porDesvincular) ?? null;

  return (
    <section id="usuarios-accesos" className="scroll-mt-20 border border-border bg-card p-4">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-cota">
        Usuarios y accesos
      </h2>
      <p className="mt-1 max-w-3xl text-[13px] text-cota">
        Cada cuenta de acceso debe apuntar a un expediente de colaborador para poder evaluar,
        capturar objetivos y ver su historial. La vinculación automática por correo se aplica al
        iniciar sesión cuando hay una sola coincidencia exacta; el resto se resuelve aquí.
      </p>

      {isLoading ? (
        <div className="mt-3 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-none" />
          ))}
        </div>
      ) : (data?.usuarios ?? []).length === 0 ? (
        <p className="mt-2 text-[13px] text-cota">Aún no hay usuarios registrados en el sistema.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-[13px]">
            <thead className="bg-grafito text-cal">
              <tr>
                {["Usuario", "Correo", "Roles", "Expediente vinculado", ""].map((h) => (
                  <th key={h} className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.usuarios ?? []).map((u) => {
                const vinculado = u.colaborador_id ?? null;
                return (
                  <tr key={u.id} className="fila-tabla border-t border-border align-top">
                    <td className="px-3 py-2 text-grafito">{u.nombre}</td>
                    <td className="cifra px-3 py-2 text-[12px] text-cota">{u.correo ?? "—"}</td>
                    <td className="px-3 py-2 text-cota">
                      {u.roles.length > 0
                        ? u.roles.map((r) => ETIQUETA_ROL[r] ?? r).join(" · ")
                        : "Sin rol asignado"}
                    </td>
                    <td className="px-3 py-2">
                      {vinculado ? (
                        <span className="text-grafito">
                          {nombreDe(vinculado) ?? "Expediente fuera del directorio activo"}
                        </span>
                      ) : (
                        <span className="cifra text-[12px] uppercase tracking-wide text-desviacion">
                          Sin vincular
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <SelectorBuscador
                          opciones={opciones}
                          valor={vinculado ?? ""}
                          ariaLabel={`Vincular expediente de ${u.nombre}`}
                          placeholder="Elegir expediente"
                          buscarPlaceholder="Buscar colaborador…"
                          disabled={vincular.isPending}
                          className="w-56"
                          onCambio={(valor) =>
                            valor && valor !== vinculado
                              ? vincular.mutate({ perfilId: u.id, antes: vinculado, despues: valor })
                              : undefined
                          }
                        />
                        {vinculado ? (
                          <Button
                            variant="outline"
                            onClick={() => setPorDesvincular(u.id)}
                            className="h-10 shrink-0 rounded-none text-[12px]"
                          >
                            Desvincular
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog
        open={porDesvincular !== null}
        onOpenChange={(abierto) => !abierto && setPorDesvincular(null)}
      >
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular expediente</AlertDialogTitle>
            <AlertDialogDescription>
              {usuarioADesvincular?.nombre} dejará de ver su evaluación, sus objetivos y su
              historial hasta que se vuelva a vincular. El movimiento queda en la bitácora de
              auditoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-10 rounded-none">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="h-10 rounded-none"
              onClick={() =>
                usuarioADesvincular
                  ? vincular.mutate({
                      perfilId: usuarioADesvincular.id,
                      antes: usuarioADesvincular.colaborador_id ?? null,
                      despues: null,
                    })
                  : undefined
              }
            >
              Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}