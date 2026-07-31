import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BandaLineaBase } from "@/components/nexus/banda-linea-base";
import { numero } from "@/lib/nexus/formato";
import {
  AVISO_AGREGADO_INSUFICIENTE,
  ETIQUETA_TIPO_OBJETIVO,
  MINIMO_AGREGADO,
  TIPOS_OBJETIVO,
  cumplimiento,
  sumaPesos,
} from "@/lib/nexus/evaluacion";

const selectCls = "h-10 w-full rounded-none";

export function PanelObjetivos({
  esTalento,
  colaboradorId,
  cicloId,
}: {
  esTalento: boolean;
  colaboradorId: string | null;
  cicloId: string;
}) {
  const queryClient = useQueryClient();
  const [abrir, setAbrir] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["objetivos-panel"],
    retry: 3,
    queryFn: async () => {
      const [objetivos, colaboradores] = await Promise.all([
        supabase.from("objetivos").select("*"),
        supabase.from("colaboradores").select("id, nombre, lider_id, estatus").order("nombre"),
      ]);
      return {
        objetivos: objetivos.data ?? [],
        colaboradores: colaboradores.data ?? [],
      };
    },
  });

  const cicloActivo = cicloId;
  const objetivos = useMemo(
    () => (data?.objetivos ?? []).filter((o) => o.ciclo_id === cicloActivo),
    [data?.objetivos, cicloActivo],
  );

  const puedeCapturar = (colabId: string | null) => {
    if (esTalento) return true;
    if (!colabId) return false;
    const c = (data?.colaboradores ?? []).find((x) => x.id === colabId);
    return !!c && !!colaboradorId && c.lider_id === colaboradorId;
  };

  const capturables = (data?.colaboradores ?? []).filter((c) => puedeCapturar(c.id));

  const agrupado = useMemo(() => {
    const mapa = new Map<string, typeof objetivos>();
    for (const o of objetivos) {
      if (!o.colaborador_id) continue;
      const lista = mapa.get(o.colaborador_id) ?? [];
      lista.push(o);
      mapa.set(o.colaborador_id, lista);
    }
    return Array.from(mapa.entries())
      .map(([id, lista]) => ({
        id,
        nombre: (data?.colaboradores ?? []).find((c) => c.id === id)?.nombre ?? "Sin nombre",
        objetivos: lista,
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [objetivos, data?.colaboradores]);

  const poblacionCiclo = agrupado.length;
  const conEsg = agrupado.filter((g) => g.objetivos.some((o) => o.tipo === "esg")).length;
  const pctEsg = poblacionCiclo > 0 ? (conEsg / poblacionCiclo) * 100 : 0;

  const crear = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase.from("objetivos").insert({
        colaborador_id: String(form.get("colaborador_id")),
        ciclo_id: cicloActivo,
        descripcion: String(form.get("descripcion")),
        tipo: String(form.get("tipo")),
        peso: Number(form.get("peso")),
        meta: Number(form.get("meta")),
        real: form.get("real") ? Number(form.get("real")) : null,
        unidad: String(form.get("unidad")) || null,
        estatus: String(form.get("estatus")),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Objetivo capturado");
      setAbrir(false);
      queryClient.invalidateQueries({ queryKey: ["objetivos-panel"] });
      queryClient.invalidateQueries({ queryKey: ["desempeno-indicadores"] });
    },
    onError: () =>
      toast.error(
        "No se capturó el objetivo. Solo el líder directo o Dirección de Talento pueden.",
      ),
  });

  const actualizarReal = useMutation({
    mutationFn: async ({ id, real }: { id: string; real: number | null }) => {
      const { error } = await supabase.from("objetivos").update({ real }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avance actualizado");
      queryClient.invalidateQueries({ queryKey: ["objetivos-panel"] });
      queryClient.invalidateQueries({ queryKey: ["desempeno-indicadores"] });
    },
    onError: () => toast.error("No se actualizó el avance. Verifica tus permisos."),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-24 w-full rounded-none" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-none" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        {capturables.length > 0 ? (
          <Dialog open={abrir} onOpenChange={setAbrir}>
            <DialogTrigger asChild>
              <Button className="h-10 rounded-none">
                <Plus className="mr-1 h-4 w-4" /> Capturar objetivo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto rounded-none">
              <DialogHeader>
                <DialogTitle>Capturar objetivo</DialogTitle>
              </DialogHeader>
              <form
                id="form-objetivo"
                onSubmit={(e) => {
                  e.preventDefault();
                  crear.mutate(new FormData(e.currentTarget));
                }}
                className="grid gap-3 sm:grid-cols-2"
              >
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="o_colab">Colaborador</Label>
                  <Select name="colaborador_id" required>
                    <SelectTrigger id="o_colab" className={selectCls}>
                      <SelectValue placeholder="Selecciona…" />
                    </SelectTrigger>
                    <SelectContent className="rounded-none">
                      {capturables.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="rounded-none">
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="o_desc">Descripción</Label>
                  <Input id="o_desc" name="descripcion" required className="h-10 rounded-none" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="o_tipo">Tipo</Label>
                  <Select name="tipo" defaultValue="proyecto">
                    <SelectTrigger id="o_tipo" className={selectCls}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-none">
                      {TIPOS_OBJETIVO.map((t) => (
                        <SelectItem key={t} value={t} className="rounded-none">
                          {ETIQUETA_TIPO_OBJETIVO[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="o_peso">Peso (%)</Label>
                  <Input
                    id="o_peso"
                    name="peso"
                    type="number"
                    min="1"
                    max="100"
                    required
                    className="cifra h-10 rounded-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="o_meta">Meta</Label>
                  <Input
                    id="o_meta"
                    name="meta"
                    type="number"
                    step="0.1"
                    required
                    className="cifra h-10 rounded-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="o_real">Real</Label>
                  <Input
                    id="o_real"
                    name="real"
                    type="number"
                    step="0.1"
                    className="cifra h-10 rounded-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="o_unidad">Unidad</Label>
                  <Input
                    id="o_unidad"
                    name="unidad"
                    placeholder="días / % de avance / horas"
                    className="h-10 rounded-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="o_estatus">Estatus</Label>
                  <Select name="estatus" defaultValue="en_curso">
                    <SelectTrigger id="o_estatus" className={selectCls}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-none">
                      <SelectItem value="en_curso" className="rounded-none">
                        En curso
                      </SelectItem>
                      <SelectItem value="parcial" className="rounded-none">
                        Parcial
                      </SelectItem>
                      <SelectItem value="cumplido" className="rounded-none">
                        Cumplido
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </form>
              <DialogFooter>
                <Button
                  form="form-objetivo"
                  type="submit"
                  disabled={crear.isPending}
                  className="h-10 rounded-none"
                >
                  Guardar objetivo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      <section className="border border-border bg-card p-4">
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-cota">
          Población con objetivo ESG ligado
        </h3>
        {poblacionCiclo < MINIMO_AGREGADO ? (
          <p className="mt-2 text-[13px] text-cota">{AVISO_AGREGADO_INSUFICIENTE}</p>
        ) : (
          <>
            <p className="cifra mt-2 text-3xl leading-none text-grafito">
              {numero(pctEsg, 0)}
              <span className="ml-1 text-base text-cota">%</span>
            </p>
            <BandaLineaBase
              className="mt-2"
              valor={pctEsg}
              meta={100}
              min={0}
              max={100}
              unidad="%"
              etiquetaMeta="Meta"
              decimales={0}
            />
            <p className="cifra mt-2 text-[11px] uppercase tracking-wide text-cota">
              {conEsg} de {poblacionCiclo} personas del ciclo
            </p>
          </>
        )}
      </section>

      {agrupado.length === 0 ? (
        <p className="border border-dashed border-border p-6 text-center text-[13px] text-cota">
          Aún no hay objetivos capturados en este ciclo.
        </p>
      ) : (
        <div className="space-y-3">
          {agrupado.map((g) => {
            const suma = sumaPesos(g.objetivos);
            const cumpl = cumplimiento(g.objetivos);
            const editable = puedeCapturar(g.id);
            return (
              <article key={g.id} className="border border-border bg-card p-4">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-semibold text-grafito">{g.nombre}</h3>
                    <p className="cifra text-[11px] uppercase tracking-wide text-cota">
                      {g.objetivos.length} objetivos · pesos suman {numero(suma, 0)}%
                    </p>
                  </div>
                  <div className="w-full sm:w-56">
                    <p className="cifra text-[11px] uppercase tracking-wide text-cota">
                      Cumplimiento
                    </p>
                    {cumpl === null ? (
                      <p className="text-[13px] text-cota">Sin metas capturadas</p>
                    ) : (
                      <BandaLineaBase
                        valor={cumpl}
                        meta={100}
                        min={0}
                        max={100}
                        unidad="%"
                        etiquetaMeta="Meta"
                        decimales={0}
                      />
                    )}
                  </div>
                </header>
                {suma !== 100 ? (
                  <p className="mt-2 border-l-2 border-desviacion bg-desviacion/10 px-3 py-1.5 text-[12px] text-grafito">
                    Los pesos suman {numero(suma, 0)}% y deben sumar 100%.
                  </p>
                ) : null}
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-[13px]">
                    <thead className="bg-grafito text-cal">
                      <tr>
                        {["Objetivo", "Tipo", "Peso", "Meta", "Real", "Estatus"].map((h) => (
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
                      {g.objetivos.map((o) => (
                        <tr key={o.id} className="border-t border-border">
                          <td className="px-3 py-2 text-grafito">{o.descripcion}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`cifra px-2 py-0.5 text-[11px] uppercase tracking-wide ${
                                o.tipo === "esg" ? "bg-linea/12 text-linea" : "bg-cota/12 text-cota"
                              }`}
                            >
                              {ETIQUETA_TIPO_OBJETIVO[o.tipo ?? ""] ?? o.tipo ?? "—"}
                            </span>
                          </td>
                          <td className="cifra px-3 py-2">{numero(o.peso, 0)}%</td>
                          <td className="cifra px-3 py-2">
                            {numero(o.meta, 1)} {o.unidad ?? ""}
                          </td>
                          <td className="cifra px-3 py-2">
                            {editable ? (
                              <Input
                                defaultValue={o.real === null ? "" : String(o.real)}
                                inputMode="decimal"
                                aria-label={`Avance real de ${o.descripcion ?? "objetivo"}`}
                                onBlur={(e) => {
                                  const v = e.target.value.trim();
                                  const num = v === "" ? null : Number(v);
                                  if (num !== null && Number.isNaN(num)) return;
                                  if (num !== o.real)
                                    actualizarReal.mutate({ id: o.id, real: num });
                                }}
                                className="cifra h-10 w-24 rounded-none"
                              />
                            ) : (
                              numero(o.real, 1)
                            )}
                          </td>
                          <td className="px-3 py-2 text-cota">{o.estatus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
