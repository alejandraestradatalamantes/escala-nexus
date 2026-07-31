import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MoreVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { iniciales } from "@/lib/nexus/formato";
import { AVISO_CONFIDENCIAL, CASILLAS, casillaDe, datosCasilla } from "@/lib/nexus/evaluacion";
import { cn } from "@/lib/utils";

const selectCls = "h-10 w-full border border-border bg-card px-2 text-[13px] text-grafito";

interface Ficha {
  id: string;
  colaboradorId: string;
  nombre: string;
  puesto: string;
  desempeno: number;
  potencial: number;
  riesgo: string | null;
  criticidad: string | null;
  cobertura: boolean;
}

export function Matriz9Box({
  esTalento,
  usuarioId,
  cicloId,
}: {
  esTalento: boolean;
  usuarioId: string | null;
  cicloId: string;
}) {
  const queryClient = useQueryClient();
  const [capas, setCapas] = useState({ riesgo: false, criticidad: false, cobertura: false });
  const [movimiento, setMovimiento] = useState<{
    ficha: Ficha;
    desempeno: number;
    potencial: number;
  } | null>(null);
  const [acuerdo, setAcuerdo] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["mapeo-talento"],
    retry: 3,
    queryFn: async () => {
      const [mapeo, colaboradores, puestos] = await Promise.all([
        supabase.from("mapeo_talento").select("*"),
        supabase.from("colaboradores").select("id, nombre, puesto_id, lider_id"),
        supabase.from("puestos").select("id, nombre"),
      ]);
      return {
        mapeo: mapeo.data ?? [],
        colaboradores: colaboradores.data ?? [],
        puestos: puestos.data ?? [],
      };
    },
  });

  const cicloActivo = cicloId;

  const fichas: Ficha[] = useMemo(() => {
    const conSucesor = new Set(
      (data?.colaboradores ?? []).map((c) => c.lider_id).filter((x): x is string => !!x),
    );
    return (data?.mapeo ?? [])
      .filter(
        (m) =>
          m.ciclo_id === cicloActivo &&
          typeof m.eje_desempeno === "number" &&
          typeof m.eje_potencial === "number",
      )
      .map((m) => {
        const c = (data?.colaboradores ?? []).find((x) => x.id === m.colaborador_id);
        return {
          id: m.id,
          colaboradorId: m.colaborador_id ?? "",
          nombre: c?.nombre ?? "Sin nombre",
          puesto: (data?.puestos ?? []).find((p) => p.id === c?.puesto_id)?.nombre ?? "Sin puesto",
          desempeno: m.eje_desempeno as number,
          potencial: m.eje_potencial as number,
          riesgo: m.riesgo_salida,
          criticidad: m.criticidad_puesto,
          cobertura: conSucesor.has(m.colaborador_id ?? ""),
        };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [data, cicloActivo]);

  const rutaCritica = fichas.filter(
    (f) => f.potencial === 3 && f.riesgo === "alto" && f.criticidad === "alta",
  );

  const mover = useMutation({
    mutationFn: async () => {
      if (!movimiento) throw new Error("sin movimiento");
      const texto = acuerdo.trim();
      if (texto.length < 20) throw new Error("acuerdo");
      const despues = {
        eje_desempeno: movimiento.desempeno,
        eje_potencial: movimiento.potencial,
        casilla_9box: casillaDe(movimiento.desempeno, movimiento.potencial),
        acuerdos: texto,
      };
      const { error } = await supabase.from("mapeo_talento").update(despues).eq("id", movimiento.ficha.id);
      if (error) throw error;
      await supabase.from("bitacora_auditoria").insert({
        usuario_id: usuarioId,
        accion: `Movió a ${movimiento.ficha.nombre} en la matriz 9-Box`,
        tabla: "mapeo_talento",
        registro_id: movimiento.ficha.id,
        antes: {
          eje_desempeno: movimiento.ficha.desempeno,
          eje_potencial: movimiento.ficha.potencial,
        },
        despues,
      });
    },
    onSuccess: () => {
      toast.success("Movimiento registrado con el acuerdo de la sesión");
      setMovimiento(null);
      setAcuerdo("");
      queryClient.invalidateQueries({ queryKey: ["mapeo-talento"] });
      queryClient.invalidateQueries({ queryKey: ["desempeno-indicadores"] });
    },
    onError: (e: Error) =>
      toast.error(
        e.message === "acuerdo"
          ? "Sin acuerdo escrito no se mueve a nadie. Registra el acuerdo de la sesión."
          : "No se guardó el movimiento. La calibración solo la captura Dirección de Talento.",
      ),
  });

  if (isLoading) {
    return (
      <div className="grid gap-2 md:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-none" />
        ))}
      </div>
    );
  }

  const colorCapa = (f: Ficha) => {
    if (capas.riesgo && f.riesgo === "alto") return "border-l-2 border-l-desviacion";
    if (capas.riesgo && f.riesgo === "medio") return "border-l-2 border-l-casco";
    if (capas.criticidad && f.criticidad === "alta") return "border-l-2 border-l-grafito";
    if (capas.cobertura) return f.cobertura ? "border-l-2 border-l-linea" : "border-l-2 border-l-casco";
    return "";
  };

  return (
    <div className="space-y-4">
      <p className="border-l-2 border-casco bg-casco/10 px-3 py-2 text-[12px] text-grafito">
        {AVISO_CONFIDENCIAL}
      </p>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {(
            [
              ["riesgo", "Riesgo de salida"],
              ["criticidad", "Criticidad del puesto"],
              ["cobertura", "Cobertura de sucesión"],
            ] as const
          ).map(([clave, etiqueta]) => (
            <div key={clave} className="flex items-center gap-2">
              <Switch
                id={`capa-${clave}`}
                checked={capas[clave]}
                onCheckedChange={(v) => setCapas((c) => ({ ...c, [clave]: v }))}
              />
              <Label htmlFor={`capa-${clave}`} className="text-[12px] text-cota">
                {etiqueta}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {rutaCritica.length > 0 ? (
        <section className="border-l-2 border-desviacion bg-desviacion/10 p-4">
          <h3 className="text-[13px] font-semibold text-desviacion">
            Ruta crítica en riesgo — {rutaCritica.length} casos
          </h3>
          <p className="mt-1 text-[13px] text-grafito">
            Alto potencial con riesgo de salida alto en puesto crítico. Si se van, el frente se detiene:
            trátalo como una actividad de ruta crítica sin holgura.
          </p>
          <ul className="mt-2 space-y-1 text-[13px] text-grafito">
            {rutaCritica.map((f) => (
              <li key={f.id} className="cifra">
                · {f.nombre} — {f.puesto}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {fichas.length === 0 ? (
        <p className="border border-dashed border-border p-6 text-center text-[13px] text-cota">
          Aún no hay mapeo de talento capturado en este ciclo.
        </p>
      ) : (
        <div className="grid gap-2 md:grid-cols-3">
          {[3, 2, 1].flatMap((pot) =>
            [1, 2, 3].map((des) => {
              const info = datosCasilla(des, pot);
              const enCasilla = fichas.filter((f) => f.desempeno === des && f.potencial === pot);
              return (
                <section key={`${pot}-${des}`} className="border border-border bg-card p-3">
                  <header className="border-b border-border pb-2">
                    <h3 className="text-[13px] font-semibold text-grafito">{info?.nombre}</h3>
                    <p className="cifra text-[11px] uppercase tracking-wide text-cota">
                      Desempeño {des} · Potencial {pot} · {enCasilla.length}
                    </p>
                    <p className="mt-1 text-[12px] leading-snug text-cota">{info?.accion}</p>
                  </header>
                  <ul className="mt-2 space-y-1.5">
                    {enCasilla.map((f) => (
                      <li
                        key={f.id}
                        className={cn(
                          "flex items-center gap-2 border border-border bg-background p-2",
                          colorCapa(f),
                        )}
                      >
                        <span className="cifra grid h-8 w-8 shrink-0 place-items-center bg-plomada text-[11px] text-primary-foreground">
                          {iniciales(f.nombre)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] text-grafito">{f.nombre}</span>
                          <span className="block truncate text-[11px] text-cota">{f.puesto}</span>
                        </span>
                        {esTalento ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                aria-label={`Mover a ${f.nombre}`}
                                className="h-10 w-10 shrink-0 rounded-none p-0"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-none">
                              <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-cota">
                                Mover a…
                              </DropdownMenuLabel>
                              {CASILLAS.map((c) => (
                                <DropdownMenuItem
                                  key={c.casilla}
                                  disabled={c.desempeno === f.desempeno && c.potencial === f.potencial}
                                  onSelect={() => {
                                    setAcuerdo("");
                                    setMovimiento({
                                      ficha: f,
                                      desempeno: c.desempeno,
                                      potencial: c.potencial,
                                    });
                                  }}
                                  className="rounded-none text-[13px]"
                                >
                                  {c.nombre}
                                  <span className="cifra ml-2 text-[11px] text-cota">
                                    D{c.desempeno}/P{c.potencial}
                                  </span>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </li>
                    ))}
                    {enCasilla.length === 0 ? (
                      <li className="text-[12px] text-cota">Sin personas en esta casilla.</li>
                    ) : null}
                  </ul>
                </section>
              );
            }),
          )}
        </div>
      )}
      <p className="cifra text-[11px] uppercase tracking-wide text-cota">
        Eje horizontal desempeño 1 a 3 · eje vertical potencial 1 a 3
      </p>

      <Dialog open={!!movimiento} onOpenChange={(v) => !v && setMovimiento(null)}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>
              Mover a {movimiento?.ficha.nombre} —{" "}
              {movimiento ? datosCasilla(movimiento.desempeno, movimiento.potencial)?.nombre : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-[13px] text-cota">
              Sin acuerdo escrito no se mueve a nadie. Registra lo que acordó el comité de calibración.
            </p>
            <Textarea
              rows={5}
              value={acuerdo}
              aria-label="Acuerdo de la sesión de calibración"
              onChange={(e) => setAcuerdo(e.target.value)}
              className="rounded-none text-[13px]"
            />
            <p className="cifra text-[11px] text-cota">{acuerdo.trim().length} de 20 caracteres mínimos</p>
          </div>
          <DialogFooter>
            <Button
              disabled={mover.isPending || acuerdo.trim().length < 20}
              onClick={() => mover.mutate()}
              className="h-10 rounded-none"
            >
              Registrar acuerdo y mover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}