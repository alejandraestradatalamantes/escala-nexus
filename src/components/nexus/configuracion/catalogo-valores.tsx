import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { EsqueletoTabla } from "@/components/nexus/esqueletos";

interface Props {
  puedeEditar: boolean;
  usuarioId: string | null;
}

/** Catálogo de valores de Escala: alimenta los reconocimientos. Vive en base, no en código. */
export function CatalogoValores({ puedeEditar, usuarioId }: Props) {
  const qc = useQueryClient();
  const [clave, setClave] = useState("");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["catalogo-valores-admin"],
    queryFn: async () => {
      const { data: r } = await supabase
        .from("catalogo_valores")
        .select("id, clave, nombre, descripcion, orden, activo, es_demo")
        .order("orden");
      return r ?? [];
    },
  });

  const agregar = useMutation({
    mutationFn: async () => {
      const c = clave.trim().toLowerCase().replace(/\s+/g, "_");
      if (!c || nombre.trim().length < 3) throw new Error("Captura clave y nombre del valor.");
      const { error } = await supabase.from("catalogo_valores").insert({
        clave: c,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        orden: (data?.length ?? 0) + 1,
        creado_por: usuarioId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Valor agregado al catálogo.");
      setClave("");
      setNombre("");
      setDescripcion("");
      qc.invalidateQueries({ queryKey: ["catalogo-valores-admin"] });
      qc.invalidateQueries({ queryKey: ["catalogo-valores"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const alternar = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase.from("catalogo_valores").update({ activo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalogo-valores-admin"] });
      qc.invalidateQueries({ queryKey: ["catalogo-valores"] });
    },
    onError: () => toast.error("No se pudo actualizar el valor."),
  });

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-[15px] text-grafito">Valores de Escala</h2>
        <p className="text-[12px] text-cota">
          Alimentan los reconocimientos del módulo Bienestar. Los valores sembrados están marcados
          como demostración y hay que confirmarlos con Escala.
        </p>
      </div>
      {isLoading ? (
        <EsqueletoTabla filas={4} columnas={4} />
      ) : (
        <div className="overflow-x-auto border border-border bg-card">
          <table className="w-full min-w-[40rem] text-[13px]">
            <thead>
              <tr className="bg-grafito text-left text-cal">
                <th className="px-3 py-2 font-semibold">Valor</th>
                <th className="px-3 py-2 font-semibold">Descripción</th>
                <th className="px-3 py-2 font-semibold">Clave</th>
                <th className="px-3 py-2 text-right font-semibold">Activo</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((v) => (
                <tr key={v.id} className="border-t border-border hover:bg-muted/50">
                  <td className="px-3 py-2.5 text-grafito">{v.nombre}</td>
                  <td className="px-3 py-2.5 text-cota">{v.descripcion ?? "—"}</td>
                  <td className="cifra px-3 py-2.5 text-cota">{v.clave}</td>
                  <td className="px-3 py-2.5 text-right">
                    <Switch
                      checked={v.activo}
                      disabled={!puedeEditar}
                      onCheckedChange={(activo) => alternar.mutate({ id: v.id, activo })}
                      aria-label={`Activar ${v.nombre}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {puedeEditar ? (
        <div className="flex flex-wrap items-end gap-2">
          <Input
            className="w-40 rounded-none"
            placeholder="clave"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
          />
          <Input
            className="w-56 rounded-none"
            placeholder="Nombre del valor"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <Input
            className="w-80 rounded-none"
            placeholder="Descripción"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
          <Button
            className="rounded-none"
            disabled={agregar.isPending}
            onClick={() => agregar.mutate()}
          >
            Agregar valor
          </Button>
        </div>
      ) : null}
    </section>
  );
}