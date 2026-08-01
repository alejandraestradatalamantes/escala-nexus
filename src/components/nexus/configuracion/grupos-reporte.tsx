import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BannerAviso } from "@/components/nexus/banner-aviso";

interface Props {
  puedeEditar: boolean;
  usuarioId: string | null;
}

interface Grupo {
  id: string;
  nombre: string;
  descripcion: string | null;
  areas: string[];
  es_demo: boolean;
}

/**
 * Catálogo de grupos de reporte: agrupa áreas pequeñas para poder reportar clima
 * sin exponerlas. La definición se congela al abrir cada encuesta.
 */
export function GruposReporte({ puedeEditar, usuarioId }: Props) {
  const qc = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Grupo | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [areas, setAreas] = useState<string[]>([]);

  const { data: grupos, isLoading } = useQuery({
    queryKey: ["grupos-reporte"],
    queryFn: async () =>
      ((await supabase.from("grupos_reporte").select("*").order("nombre")).data ??
        []) as Grupo[],
  });

  const { data: areasDisponibles } = useQuery({
    queryKey: ["areas-colaboradores"],
    queryFn: async () => {
      const { data } = await supabase.from("colaboradores").select("area").not("area", "is", null);
      return [...new Set((data ?? []).map((c) => c.area as string))].sort((a, b) =>
        a.localeCompare(b, "es"),
      );
    },
  });

  const abrir = (g: Grupo | null) => {
    setEditando(g);
    setNombre(g?.nombre ?? "");
    setDescripcion(g?.descripcion ?? "");
    setAreas(g?.areas ?? []);
    setAbierto(true);
  };

  const guardar = useMutation({
    mutationFn: async () => {
      if (nombre.trim().length < 3) throw new Error("Ponle un nombre reconocible al grupo.");
      if (areas.length === 0) throw new Error("Asigna al menos un área al grupo.");
      const fila = { nombre: nombre.trim(), descripcion: descripcion.trim() || null, areas };
      const antes = editando
        ? { nombre: editando.nombre, descripcion: editando.descripcion, areas: editando.areas }
        : null;
      const { error } = editando
        ? await supabase.from("grupos_reporte").update(fila).eq("id", editando.id)
        : await supabase.from("grupos_reporte").insert({ ...fila, creado_por: usuarioId });
      if (error) throw new Error(error.message);
      await supabase.from("bitacora_auditoria").insert({
        usuario_id: usuarioId,
        accion: editando ? "Editó un grupo de reporte" : "Creó un grupo de reporte",
        tabla: "grupos_reporte",
        registro_id: editando?.id ?? null,
        antes: antes as never,
        despues: fila as never,
      });
    },
    onSuccess: () => {
      toast.success("Catálogo de grupos actualizado y registrado en la bitácora.");
      setAbierto(false);
      qc.invalidateQueries({ queryKey: ["grupos-reporte"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const asignadasEnOtros = new Set(
    (grupos ?? [])
      .filter((g) => g.id !== editando?.id)
      .flatMap((g) => g.areas),
  );

  return (
    <section className="border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-cota">
            <Users className="h-4 w-4 text-info" aria-hidden />
            Grupos de reporte
          </h2>
          <p className="mt-1 max-w-3xl text-[13px] text-cota">
            Agrupan áreas para reportar clima en cortes que sí alcanzan el umbral, sin exponer áreas
            pequeñas. Un área pertenece a un solo grupo. Al abrir una encuesta, la definición se
            congela: reacomodar los grupos después no altera los resultados ya levantados.
          </p>
        </div>
        {puedeEditar ? (
          <Dialog open={abierto} onOpenChange={setAbierto}>
            <DialogTrigger asChild>
              <Button className="h-9 shrink-0 rounded-none text-[12px]" onClick={() => abrir(null)}>
                Nuevo grupo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base">
                  {editando ? `Editar ${editando.nombre}` : "Nuevo grupo de reporte"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="cifra text-[11px] uppercase tracking-wide text-cota">
                    Nombre
                  </Label>
                  <Input
                    className="mt-1 rounded-none"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Soporte corporativo"
                  />
                </div>
                <div>
                  <Label className="cifra text-[11px] uppercase tracking-wide text-cota">
                    Descripción
                  </Label>
                  <Textarea
                    className="mt-1 rounded-none"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="cifra text-[11px] uppercase tracking-wide text-cota">
                    Áreas del grupo
                  </Label>
                  <ul className="mt-1 max-h-56 space-y-1.5 overflow-y-auto border border-border p-2">
                    {(areasDisponibles ?? []).map((a) => {
                      const tomada = asignadasEnOtros.has(a);
                      return (
                        <li key={a} className="flex items-center gap-2">
                          <Checkbox
                            id={`area-${a}`}
                            checked={areas.includes(a)}
                            disabled={tomada}
                            onCheckedChange={(v) =>
                              setAreas((prev) =>
                                v === true ? [...prev, a] : prev.filter((x) => x !== a),
                              )
                            }
                          />
                          <label
                            htmlFor={`area-${a}`}
                            className="text-[13px] text-grafito data-[tomada=true]:text-cota"
                            data-tomada={tomada}
                          >
                            {a}
                            {tomada ? " · ya asignada a otro grupo" : ""}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <Button
                  className="w-full rounded-none"
                  disabled={guardar.isPending}
                  onClick={() => guardar.mutate()}
                >
                  Guardar grupo
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      <BannerAviso tono="alerta" className="mt-3 max-w-3xl">
        Los tres grupos sembrados están marcados como demostración: Dirección de Talento debe
        confirmarlos antes de usarlos para reportar ante Dirección. No se puede editar ni borrar un
        grupo mientras una encuesta vigente lo tenga congelado; cierra la encuesta primero.
      </BannerAviso>

      {isLoading ? (
        <div className="mt-3 space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-none" />
          ))}
        </div>
      ) : (grupos ?? []).length === 0 ? (
        <p className="mt-3 text-[13px] text-cota">Aún no hay grupos de reporte.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border border-t border-border">
          {(grupos ?? []).map((g) => (
            <li key={g.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-grafito">
                  {g.nombre}
                  {g.es_demo ? (
                    <span className="cifra ml-2 bg-alerta-suave px-2 py-0.5 text-[10px] uppercase tracking-wide text-alerta">
                      Demostración
                    </span>
                  ) : null}
                </p>
                {g.descripcion ? (
                  <p className="mt-0.5 text-[12px] text-cota">{g.descripcion}</p>
                ) : null}
                <p className="mt-1 text-[12px] text-grafito">{g.areas.join(" · ")}</p>
              </div>
              {puedeEditar ? (
                <Button
                  variant="outline"
                  className="h-9 shrink-0 rounded-none text-[12px]"
                  onClick={() => abrir(g)}
                >
                  Editar
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}