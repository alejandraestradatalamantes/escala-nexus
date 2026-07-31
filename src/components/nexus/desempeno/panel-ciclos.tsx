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
import { fechaCorta } from "@/lib/nexus/formato";
import { ETIQUETA_ESTATUS_CICLO, TIPOS_CICLO } from "@/lib/nexus/evaluacion";

const selectCls = "h-10 w-full rounded-none";

interface Colaborador {
  id: string;
  nombre: string;
  area: string | null;
  ubicacion: string;
  proyecto_actual_id: string | null;
  lider_id: string | null;
  estatus: string;
}

export function PanelCiclos({ esTalento }: { esTalento: boolean }) {
  const queryClient = useQueryClient();
  const [abrir, setAbrir] = useState(false);
  const [criterio, setCriterio] = useState<"todos" | "area" | "ubicacion" | "proyecto">("todos");
  const [valorCriterio, setValorCriterio] = useState("");
  const [faltantes, setFaltantes] = useState<{ ciclo: string; nombres: string[] } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["ciclos-desempeno"],
    retry: 3,
    queryFn: async () => {
      const [ciclos, evaluaciones, objetivos, colaboradores, proyectos] = await Promise.all([
        supabase.from("ciclos_evaluacion").select("*").order("fecha_inicio", { ascending: false }),
        supabase.from("evaluaciones").select("id, ciclo_id, colaborador_id, estatus, relacion"),
        supabase.from("objetivos").select("colaborador_id, ciclo_id, tipo"),
        supabase
          .from("colaboradores")
          .select("id, nombre, area, ubicacion, proyecto_actual_id, lider_id, estatus")
          .order("nombre"),
        supabase.from("proyectos").select("id, nombre").order("nombre"),
      ]);
      return {
        ciclos: ciclos.data ?? [],
        evaluaciones: evaluaciones.data ?? [],
        objetivos: objetivos.data ?? [],
        colaboradores: (colaboradores.data ?? []) as Colaborador[],
        proyectos: proyectos.data ?? [],
      };
    },
  });

  const areas = useMemo(
    () =>
      Array.from(
        new Set((data?.colaboradores ?? []).map((c) => c.area).filter(Boolean)),
      ) as string[],
    [data?.colaboradores],
  );

  const poblacion = useMemo(() => {
    const activos = (data?.colaboradores ?? []).filter((c) => c.estatus === "activo");
    if (criterio === "todos") return activos;
    if (criterio === "area") return activos.filter((c) => c.area === valorCriterio);
    if (criterio === "ubicacion") return activos.filter((c) => c.ubicacion === valorCriterio);
    return activos.filter((c) => c.proyecto_actual_id === valorCriterio);
  }, [data?.colaboradores, criterio, valorCriterio]);

  const crear = useMutation({
    mutationFn: async (form: FormData) => {
      const tipo = String(form.get("tipo"));
      const { data: ciclo, error } = await supabase
        .from("ciclos_evaluacion")
        .insert({
          nombre: String(form.get("nombre")),
          tipo,
          fecha_inicio: String(form.get("fecha_inicio")) || null,
          fecha_fin: String(form.get("fecha_fin")) || null,
          estatus: "en_curso",
        })
        .select("id")
        .single();
      if (error) throw error;

      const filas: {
        ciclo_id: string;
        colaborador_id: string;
        evaluador_id: string;
        relacion: string;
        estatus: string;
      }[] = [];
      const todos = data?.colaboradores ?? [];
      for (const c of poblacion) {
        filas.push({
          ciclo_id: ciclo.id,
          colaborador_id: c.id,
          evaluador_id: c.id,
          relacion: "auto",
          estatus: "pendiente",
        });
        if (c.lider_id) {
          filas.push({
            ciclo_id: ciclo.id,
            colaborador_id: c.id,
            evaluador_id: c.lider_id,
            relacion: "jefe",
            estatus: "pendiente",
          });
        }
        if (tipo === "360") {
          const pares = todos
            .filter(
              (p) =>
                p.id !== c.id &&
                p.estatus === "activo" &&
                p.proyecto_actual_id &&
                p.proyecto_actual_id === c.proyecto_actual_id,
            )
            .slice(0, 3);
          for (const p of pares) {
            filas.push({
              ciclo_id: ciclo.id,
              colaborador_id: c.id,
              evaluador_id: p.id,
              relacion: "par",
              estatus: "pendiente",
            });
          }
        }
      }
      if (filas.length > 0) {
        const { error: e2 } = await supabase.from("evaluaciones").insert(filas);
        if (e2) throw e2;
      }
      return filas.length;
    },
    onSuccess: (n) => {
      toast.success(`Ciclo creado con ${n} evaluaciones generadas`);
      setAbrir(false);
      queryClient.invalidateQueries({ queryKey: ["ciclos-desempeno"] });
      queryClient.invalidateQueries({ queryKey: ["desempeno-indicadores"] });
      queryClient.invalidateQueries({ queryKey: ["mis-evaluaciones"] });
    },
    onError: () => toast.error("No se creó el ciclo. Solo Dirección de Talento puede abrirlo."),
  });

  const cerrar = useMutation({
    mutationFn: async (cicloId: string) => {
      const evs = (data?.evaluaciones ?? []).filter((e) => e.ciclo_id === cicloId);
      const pobl = Array.from(
        new Set(evs.map((e) => e.colaborador_id).filter(Boolean)),
      ) as string[];
      const conEsg = new Set(
        (data?.objetivos ?? [])
          .filter((o) => o.ciclo_id === cicloId && o.tipo === "esg")
          .map((o) => o.colaborador_id),
      );
      const sin = pobl.filter((id) => !conEsg.has(id));
      if (sin.length > 0) {
        const nombres = sin
          .map((id) => (data?.colaboradores ?? []).find((c) => c.id === id)?.nombre ?? "Sin nombre")
          .sort();
        const ciclo = (data?.ciclos ?? []).find((c) => c.id === cicloId);
        setFaltantes({ ciclo: ciclo?.nombre ?? "", nombres });
        throw new Error("esg");
      }
      const { error } = await supabase
        .from("ciclos_evaluacion")
        .update({ estatus: "cerrado" })
        .eq("id", cicloId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ciclo cerrado");
      queryClient.invalidateQueries({ queryKey: ["ciclos-desempeno"] });
      queryClient.invalidateQueries({ queryKey: ["desempeno-indicadores"] });
    },
    onError: (e: Error) =>
      toast.error(
        e.message === "esg"
          ? "Cierre bloqueado: falta objetivo ESG en parte de la población incluida."
          : "No se cerró el ciclo. Verifica tus permisos.",
      ),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-none" />
        ))}
      </div>
    );
  }

  const ciclos = data?.ciclos ?? [];

  return (
    <div className="space-y-4">
      {esTalento ? (
        <Dialog open={abrir} onOpenChange={setAbrir}>
          <DialogTrigger asChild>
            <Button className="h-10 rounded-none">
              <Plus className="mr-1 h-4 w-4" /> Abrir ciclo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto rounded-none">
            <DialogHeader>
              <DialogTitle>Abrir ciclo de evaluación</DialogTitle>
            </DialogHeader>
            <form
              id="form-ciclo"
              onSubmit={(e) => {
                e.preventDefault();
                crear.mutate(new FormData(e.currentTarget));
              }}
              className="grid gap-3 sm:grid-cols-2"
            >
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="c_nombre">Nombre del ciclo</Label>
                <Input id="c_nombre" name="nombre" required className="h-10 rounded-none" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c_tipo">Tipo</Label>
                <Select name="tipo" defaultValue="180">
                  <SelectTrigger id="c_tipo" className={selectCls}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
                    {TIPOS_CICLO.map((t) => (
                      <SelectItem key={t} value={t} className="rounded-none">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c_inicio">Inicio</Label>
                <Input
                  id="c_inicio"
                  name="fecha_inicio"
                  type="date"
                  required
                  className="h-10 rounded-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c_fin">Cierre</Label>
                <Input
                  id="c_fin"
                  name="fecha_fin"
                  type="date"
                  required
                  className="h-10 rounded-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c_criterio">Población por</Label>
                <Select
                  value={criterio}
                  onValueChange={(v) => {
                    setCriterio(v as typeof criterio);
                    setValorCriterio("");
                  }}
                >
                  <SelectTrigger id="c_criterio" className={selectCls}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
                    <SelectItem value="todos" className="rounded-none">
                      Toda la plantilla activa
                    </SelectItem>
                    <SelectItem value="area" className="rounded-none">
                      Área
                    </SelectItem>
                    <SelectItem value="ubicacion" className="rounded-none">
                      Ubicación
                    </SelectItem>
                    <SelectItem value="proyecto" className="rounded-none">
                      Proyecto
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {criterio !== "todos" ? (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="c_valor">Selección</Label>
                  <Select value={valorCriterio || undefined} onValueChange={setValorCriterio}>
                    <SelectTrigger id="c_valor" className={selectCls}>
                      <SelectValue placeholder="Selecciona…" />
                    </SelectTrigger>
                    <SelectContent className="rounded-none">
                      {(criterio === "area"
                        ? areas.map((a) => ({ v: a, t: a }))
                        : criterio === "ubicacion"
                          ? ["corporativo", "campo"].map((u) => ({ v: u, t: u }))
                          : (data?.proyectos ?? []).map((p) => ({ v: p.id, t: p.nombre }))
                      ).map((o) => (
                        <SelectItem key={o.v} value={o.v} className="rounded-none">
                          {o.t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <p className="cifra sm:col-span-2 text-[11px] uppercase tracking-wide text-cota">
                Población incluida {poblacion.length} personas
              </p>
            </form>
            <DialogFooter>
              <Button
                form="form-ciclo"
                type="submit"
                disabled={crear.isPending || poblacion.length === 0}
                className="h-10 rounded-none"
              >
                Crear y generar evaluaciones
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      {faltantes ? (
        <div className="border-l-2 border-desviacion bg-desviacion/10 p-4">
          <h3 className="text-[13px] font-semibold text-desviacion">
            Cierre bloqueado — {faltantes.ciclo}
          </h3>
          <p className="mt-1 text-[13px] text-grafito">
            {faltantes.nombres.length} personas de la población incluida no tienen un objetivo de
            tipo ESG ligado. El estándar de objetivos ASG ligados a desempeño es una regla del
            sistema.
          </p>
          <ul className="cifra mt-2 grid gap-1 text-[12px] text-grafito sm:grid-cols-2">
            {faltantes.nombres.map((n) => (
              <li key={n}>· {n}</li>
            ))}
          </ul>
          <Button
            variant="outline"
            onClick={() => setFaltantes(null)}
            className="mt-3 h-9 rounded-none text-[12px]"
          >
            Entendido
          </Button>
        </div>
      ) : null}

      {ciclos.length === 0 ? (
        <p className="border border-dashed border-border p-6 text-center text-[13px] text-cota">
          Aún no hay ciclos de evaluación. Abre el primero para generar las evaluaciones.
        </p>
      ) : (
        <div className="space-y-3">
          {ciclos.map((ciclo) => {
            const evs = (data?.evaluaciones ?? []).filter((e) => e.ciclo_id === ciclo.id);
            const esperadas = evs.length;
            const respondidas = evs.filter((e) => e.estatus === "completado").length;
            const pobl = new Set(evs.map((e) => e.colaborador_id));
            const avance = esperadas > 0 ? (respondidas / esperadas) * 100 : 0;
            return (
              <article key={ciclo.id} className="border border-border bg-card p-4">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-semibold text-grafito">{ciclo.nombre}</h3>
                    <p className="cifra mt-1 text-[11px] uppercase tracking-wide text-cota">
                      Tipo {ciclo.tipo ?? "—"} · {fechaCorta(ciclo.fecha_inicio)} a{" "}
                      {fechaCorta(ciclo.fecha_fin)} · {pobl.size} personas
                    </p>
                  </div>
                  <span
                    className={`cifra shrink-0 px-2 py-1 text-[11px] uppercase tracking-wide ${
                      ciclo.estatus === "cerrado"
                        ? "bg-cota/12 text-cota"
                        : "bg-linea/12 text-linea"
                    }`}
                  >
                    {ETIQUETA_ESTATUS_CICLO[ciclo.estatus] ?? ciclo.estatus}
                  </span>
                </header>
                <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <div>
                    <p className="cifra text-[11px] uppercase tracking-wide text-cota">
                      Avance de respuestas {respondidas} de {esperadas}
                    </p>
                    <BandaLineaBase
                      className="mt-1"
                      valor={avance}
                      meta={100}
                      min={0}
                      max={100}
                      unidad="%"
                      etiquetaMeta="Meta"
                      decimales={0}
                    />
                  </div>
                  {esTalento && ciclo.estatus !== "cerrado" ? (
                    <Button
                      variant="outline"
                      disabled={cerrar.isPending}
                      onClick={() => cerrar.mutate(ciclo.id)}
                      className="h-10 rounded-none text-[12px]"
                    >
                      Cerrar ciclo
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
