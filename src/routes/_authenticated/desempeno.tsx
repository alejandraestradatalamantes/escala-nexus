import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
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
import {
  EscaleraCompetencia,
  type NivelEscalera,
} from "@/components/nexus/desempeno/escalera-competencia";
import { IndicadoresDesempeno } from "@/components/nexus/desempeno/indicadores-desempeno";
import { PanelCiclos } from "@/components/nexus/desempeno/panel-ciclos";
import { MiEvaluacion } from "@/components/nexus/desempeno/mi-evaluacion";
import { PanelObjetivos } from "@/components/nexus/desempeno/panel-objetivos";
import { Matriz9Box } from "@/components/nexus/desempeno/matriz-9box";
import { useSesion } from "@/hooks/use-sesion";
import { fechaCorta } from "@/lib/nexus/formato";
import {
  AVISO_PERFIL_PROPUESTO,
  leerPerfil,
  NIVELES,
  perfilAJson,
  type PerfilCompetencias,
} from "@/lib/nexus/desempeno";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/desempeno")({
  head: () => ({
    meta: [
      { title: "Desempeño — ESCALA Nexus" },
      { name: "description", content: "Evaluaciones por competencias, objetivos por proyecto y calibración. Cada resultado se leerá como desviación contra la meta acordada." },
      { property: "og:title", content: "Desempeño — ESCALA Nexus" },
      { property: "og:description", content: "Evaluaciones por competencias, objetivos por proyecto y calibración. Cada resultado se leerá como desviación contra la meta acordada." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Desempeno,
});

const GRUPOS = ["Estrategia", "Gestión", "Personas"] as const;

function AvisoPropuesto({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "border-l-2 border-casco bg-casco/10 px-3 py-2 text-[12px] text-grafito",
        className,
      )}
    >
      {AVISO_PERFIL_PROPUESTO}
    </p>
  );
}

function Desempeno() {
  const { sesion, tiene } = useSesion();
  const esTalento = tiene("direccion_talento");
  const vePerfiles = tiene("direccion_talento", "direccion_general", "ti_sistema");
  const veCiclos = tiene("direccion_talento", "direccion_general");
  const veMapeo = tiene("direccion_talento", "direccion_general", "lider_proyecto");
  const queryClient = useQueryClient();
  const hoy = fechaCorta(new Date());

  const [abierta, setAbierta] = useState<string | null>(null);
  const [celda, setCelda] = useState<{ puesto: string; competencia: string } | null>(null);
  const [porValidar, setPorValidar] = useState<string | null>(null);
  const [cicloId, setCicloId] = useState("");
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [validandoLote, setValidandoLote] = useState(false);

  const { data: ciclos, isLoading: cargandoCiclos } = useQuery({
    queryKey: ["ciclos-desempeno"],
    retry: 3,
    queryFn: async () => {
      const { data } = await supabase
        .from("ciclos_evaluacion")
        .select("id, nombre, estatus, fecha_inicio")
        .order("fecha_inicio", { ascending: false });
      return data ?? [];
    },
  });

  const cicloActivo =
    cicloId ||
    (ciclos ?? []).find((c) => c.estatus !== "cerrado")?.id ||
    (ciclos ?? [])[0]?.id ||
    "";
  const cicloElegido = (ciclos ?? []).find((c) => c.id === cicloActivo) ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["modelo-liderazgo"],
    retry: 3,
    queryFn: async () => {
      const [competencias, niveles, comportamientos, puestos] = await Promise.all([
        supabase.from("competencias").select("id, grupo, nombre, descripcion, orden").order("orden"),
        supabase
          .from("niveles_competencia")
          .select("id, competencia_id, nivel, etiqueta, descripcion, resumen")
          .order("nivel"),
        supabase.from("comportamientos").select("id, nivel_competencia_id, texto, orden").order("orden"),
        supabase
          .from("puestos")
          .select("id, nombre, nivel_organizacional, perfil_competencias")
          .order("nombre"),
      ]);
      return {
        competencias: competencias.data ?? [],
        niveles: niveles.data ?? [],
        comportamientos: comportamientos.data ?? [],
        puestos: puestos.data ?? [],
      };
    },
  });

  const { data: mio } = useQuery({
    queryKey: ["mi-desempeno", sesion?.colaboradorId],
    enabled: !!sesion?.colaboradorId,
    queryFn: async () => {
      const colaboradorId = sesion?.colaboradorId as string;
      const { data: colaborador } = await supabase
        .from("colaboradores")
        .select("id, puesto_id")
        .eq("id", colaboradorId)
        .maybeSingle();
      const { data: evaluacion } = await supabase
        .from("evaluaciones")
        .select("id, created_at")
        .eq("colaborador_id", colaboradorId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const observados: Record<string, number> = {};
      if (evaluacion) {
        const { data: filas } = await supabase
          .from("evaluacion_competencias")
          .select("competencia_id, nivel_observado")
          .eq("evaluacion_id", evaluacion.id);
        for (const f of filas ?? []) {
          if (f.competencia_id && typeof f.nivel_observado === "number") {
            observados[f.competencia_id] = f.nivel_observado;
          }
        }
      }
      return { puestoId: colaborador?.puesto_id ?? null, observados };
    },
  });

  const puestos = data?.puestos ?? [];
  const competencias = data?.competencias ?? [];

  const miPuesto = useMemo(
    () => puestos.find((p) => p.id === mio?.puestoId) ?? null,
    [puestos, mio?.puestoId],
  );
  const miPerfil: PerfilCompetencias | null = miPuesto
    ? leerPerfil(miPuesto.perfil_competencias)
    : null;

  const nivelesDe = (competenciaId: string): NivelEscalera[] =>
    (data?.niveles ?? [])
      .filter((n) => n.competencia_id === competenciaId)
      .map((n) => ({
        nivel: n.nivel,
        etiqueta: n.etiqueta,
        descripcion: n.descripcion,
        resumen: n.resumen,
        comportamientos: (data?.comportamientos ?? [])
          .filter((c) => c.nivel_competencia_id === n.id)
          .map((c) => ({ id: c.id, texto: c.texto, orden: c.orden })),
      }));

  const registrarBitacora = async (
    accion: string,
    registroId: string,
    antes: unknown,
    despues: unknown,
  ) => {
    await supabase.from("bitacora_auditoria").insert({
      usuario_id: sesion?.userId ?? null,
      accion,
      tabla: "puestos",
      registro_id: registroId,
      antes: antes as never,
      despues: despues as never,
    });
  };

  const guardarNivel = useMutation({
    mutationFn: async ({
      puestoId,
      competenciaId,
      valor,
    }: {
      puestoId: string;
      competenciaId: string;
      valor: number;
    }) => {
      const puesto = puestos.find((p) => p.id === puestoId);
      if (!puesto) throw new Error("puesto no encontrado");
      const antes = leerPerfil(puesto.perfil_competencias);
      const despues: PerfilCompetencias = {
        ...antes,
        niveles: { ...antes.niveles, [competenciaId]: valor },
      };
      const { error } = await supabase
        .from("puestos")
        .update({ perfil_competencias: perfilAJson(despues) })
        .eq("id", puestoId);
      if (error) throw error;
      await registrarBitacora(
        `Actualizó el nivel meta de ${puesto.nombre}`,
        puestoId,
        { niveles: antes.niveles },
        { niveles: despues.niveles },
      );
    },
    onSuccess: () => {
      toast.success("Nivel meta actualizado y registrado en la bitácora");
      setCelda(null);
      queryClient.invalidateQueries({ queryKey: ["modelo-liderazgo"] });
    },
    onError: () => toast.error("No se guardó el nivel. Solo Dirección de Talento puede editarlo."),
  });

  const validarPerfil = useMutation({
    mutationFn: async (puestoId: string) => {
      const puesto = puestos.find((p) => p.id === puestoId);
      if (!puesto) throw new Error("puesto no encontrado");
      const antes = leerPerfil(puesto.perfil_competencias);
      const despues: PerfilCompetencias = {
        ...antes,
        validado: true,
        fecha_validacion: new Date().toISOString(),
        validado_por: sesion?.userId ?? null,
      };
      const { error } = await supabase
        .from("puestos")
        .update({ perfil_competencias: perfilAJson(despues) })
        .eq("id", puestoId);
      if (error) throw error;
      await registrarBitacora(`Validó el perfil de competencias de ${puesto.nombre}`, puestoId, antes, despues);
    },
    onSuccess: () => {
      toast.success("Perfil validado. Ya funciona como línea base de evaluaciones.");
      setPorValidar(null);
      queryClient.invalidateQueries({ queryKey: ["modelo-liderazgo"] });
    },
    onError: () => toast.error("No se pudo validar el perfil. Requiere rol de Dirección de Talento."),
  });

  const competenciaAbierta = competencias.find((c) => c.id === abierta) ?? null;
  const puestoAValidar = puestos.find((p) => p.id === porValidar) ?? null;
  const pendientes = puestos.filter((p) => !leerPerfil(p.perfil_competencias).validado);
  const seleccionados = seleccion.filter((id) => pendientes.some((p) => p.id === id));

  const alternar = (id: string, marcado: boolean) =>
    setSeleccion((prev) => (marcado ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)));

  const validarLote = async () => {
    setValidandoLote(true);
    let ok = 0;
    for (const id of seleccionados) {
      try {
        await validarPerfil.mutateAsync(id);
        ok += 1;
      } catch {
        // se reporta al final; un fallo no detiene el resto del lote
      }
    }
    setValidandoLote(false);
    setSeleccion([]);
    if (ok === seleccionados.length) {
      toast.success(`${ok} perfiles validados y registrados en la bitácora`);
    } else {
      toast.error(`Se validaron ${ok} de ${seleccionados.length} perfiles. Revisa tus permisos.`);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl text-grafito">Desempeño</h1>
          <p className="cifra mt-1 text-[12px] uppercase tracking-wide text-cota">
            Modelo de liderazgo · 8 competencias · 5 niveles de dominio
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ciclo-modulo">Ciclo</Label>
            {cargandoCiclos ? (
              <Skeleton className="h-10 w-52 rounded-none" />
            ) : (
              <Select value={cicloActivo} onValueChange={setCicloId}>
                <SelectTrigger id="ciclo-modulo" className="h-10 w-52 rounded-none">
                  <SelectValue placeholder="Sin ciclos" />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  {(ciclos ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id} className="rounded-none">
                      {c.nombre} · {c.estatus}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <span className="cifra pb-2.5 text-[12px] text-cota">Corte {hoy}</span>
        </div>
      </header>

      {!cargandoCiclos && cicloElegido ? (
        <p className="cifra text-[11px] uppercase tracking-wide text-cota">
          Todo lo que sigue corresponde al ciclo {cicloElegido.nombre} ({cicloElegido.estatus}).
        </p>
      ) : null}

      <IndicadoresDesempeno cicloId={cicloActivo} />

      <Tabs defaultValue="modelo">
        <TabsList className="rounded-none">
          <TabsTrigger value="mi-evaluacion" className="rounded-none text-[13px]">
            Mi evaluación
          </TabsTrigger>
          <TabsTrigger value="modelo" className="rounded-none text-[13px]">
            Modelo de liderazgo
          </TabsTrigger>
          {veCiclos ? (
            <TabsTrigger value="ciclos" className="rounded-none text-[13px]">
              Ciclos
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="objetivos" className="rounded-none text-[13px]">
            Objetivos
          </TabsTrigger>
          {veMapeo ? (
            <TabsTrigger value="mapeo" className="rounded-none text-[13px]">
              Mapeo de talento
            </TabsTrigger>
          ) : null}
          {vePerfiles ? (
            <TabsTrigger value="perfiles" className="rounded-none text-[13px]">
              Perfiles por puesto
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="mi-evaluacion" className="mt-4">
          <MiEvaluacion colaboradorId={sesion?.colaboradorId ?? null} />
        </TabsContent>

        {veCiclos ? (
          <TabsContent value="ciclos" className="mt-4">
            <PanelCiclos esTalento={esTalento} />
          </TabsContent>
        ) : null}

        <TabsContent value="objetivos" className="mt-4">
          <PanelObjetivos
            esTalento={esTalento}
            colaboradorId={sesion?.colaboradorId ?? null}
            cicloId={cicloActivo}
          />
        </TabsContent>

        {veMapeo ? (
          <TabsContent value="mapeo" className="mt-4">
            <Matriz9Box
              esTalento={esTalento}
              usuarioId={sesion?.userId ?? null}
              cicloId={cicloActivo}
            />
          </TabsContent>
        ) : null}

        <TabsContent value="modelo" className="mt-4">
          {isLoading ? (
            <div className="grid gap-4 lg:grid-cols-3">
              {GRUPOS.map((g) => (
                <div key={g} className="space-y-3">
                  <Skeleton className="h-3 w-28 rounded-none" />
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="space-y-2 border border-border bg-card p-4">
                      <Skeleton className="h-4 w-40 rounded-none" />
                      <Skeleton className="h-3 w-full rounded-none" />
                      <Skeleton className="h-3 w-2/3 rounded-none" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : competencias.length === 0 ? (
            <p className="border border-dashed border-border p-6 text-center text-[13px] text-cota">
              Aún no hay competencias cargadas. Pide a Dirección de Talento que siembre el modelo de
              liderazgo.
            </p>
          ) : (
            <div className="space-y-4">
              {miPerfil && !miPerfil.validado ? <AvisoPropuesto /> : null}
              <div className="grid gap-4 lg:grid-cols-3">
                {GRUPOS.map((grupo) => (
                  <section key={grupo} className="space-y-3">
                    <h2 className="cifra text-[11px] font-semibold uppercase tracking-wide text-cota">
                      {grupo}
                    </h2>
                    {competencias
                      .filter((c) => c.grupo === grupo)
                      .map((c) => {
                        const meta = miPerfil?.validado ? miPerfil.niveles[c.id] : undefined;
                        const obs = miPerfil?.validado ? mio?.observados[c.id] : undefined;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setAbierta(c.id)}
                            className="w-full border border-border bg-card p-4 text-left transition-colors hover:border-grafito"
                          >
                            <h3 className="text-[14px] font-semibold text-grafito">{c.nombre}</h3>
                            <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-cota">
                              {c.descripcion}
                            </p>
                            {meta !== undefined ? (
                              <p className="cifra mt-2 flex gap-3 border-t border-border pt-2 text-[11px] uppercase tracking-wide text-cota">
                                <span>Meta {meta}</span>
                                <span>Observado {obs ?? "—"}</span>
                              </p>
                            ) : null}
                          </button>
                        );
                      })}
                  </section>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {vePerfiles ? (
          <TabsContent value="perfiles" className="mt-4 space-y-3">
            <p className="text-[13px] text-cota">
              Nivel meta por puesto y competencia.{" "}
              {esTalento
                ? "Haz clic en una celda para ajustarlo; cada cambio queda en la bitácora."
                : "Solo Dirección de Talento puede editar estos niveles."}
            </p>
            {esTalento && pendientes.length > 0 ? (
              <div className="flex flex-wrap items-center gap-3 border border-border bg-card px-3 py-2">
                <Checkbox
                  id="seleccionar-pendientes"
                  className="rounded-none"
                  checked={seleccionados.length === pendientes.length && pendientes.length > 0}
                  onCheckedChange={(v) =>
                    setSeleccion(v === true ? pendientes.map((p) => p.id) : [])
                  }
                />
                <Label htmlFor="seleccionar-pendientes" className="text-[13px] text-grafito">
                  Seleccionar los {pendientes.length} perfiles propuestos
                </Label>
                <span className="cifra text-[12px] text-cota">
                  {seleccionados.length} seleccionados
                </span>
                <Button
                  className="ml-auto h-10 rounded-none"
                  disabled={seleccionados.length === 0 || validandoLote}
                  onClick={validarLote}
                >
                  {validandoLote
                    ? "Validando…"
                    : `Validar ${seleccionados.length || ""} perfiles`.trim()}
                </Button>
              </div>
            ) : null}
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-none" />
                ))}
              </div>
            ) : puestos.length === 0 ? (
              <p className="border border-dashed border-border p-6 text-center text-[13px] text-cota">
                Aún no hay puestos en el catálogo. Créalos en Configuración para definir su perfil.
              </p>
            ) : (
              <>
                {/* Matriz — escritorio */}
                <div className="hidden overflow-x-auto border border-border bg-card md:block">
                  <table className="w-full min-w-[900px] text-left text-[13px]">
                    <thead className="bg-grafito text-cal">
                      <tr>
                        {esTalento ? (
                          <th className="w-10 px-3 py-2">
                            <span className="sr-only">Seleccionar</span>
                          </th>
                        ) : null}
                        <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide">
                          Puesto
                        </th>
                        {competencias.map((c) => (
                          <th
                            key={c.id}
                            title={c.nombre}
                            className="max-w-24 truncate px-2 py-2 text-[11px] font-semibold uppercase tracking-wide"
                          >
                            {c.nombre}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {puestos.map((p) => {
                        const perfil = leerPerfil(p.perfil_competencias);
                        return (
                          <tr key={p.id} className="fila-tabla border-t border-border">
                            {esTalento ? (
                              <td className="px-3 py-2">
                                {perfil.validado ? null : (
                                  <Checkbox
                                    className="rounded-none"
                                    aria-label={`Seleccionar el perfil de ${p.nombre}`}
                                    checked={seleccion.includes(p.id)}
                                    onCheckedChange={(v) => alternar(p.id, v === true)}
                                  />
                                )}
                              </td>
                            ) : null}
                            <td className="px-3 py-2">
                              <span className="text-grafito">{p.nombre}</span>
                              <span className="cifra block text-[11px] text-cota">
                                {p.nivel_organizacional ?? "—"}
                              </span>
                            </td>
                            {competencias.map((c) => {
                              const valor = perfil.niveles[c.id];
                              const editando =
                                celda?.puesto === p.id && celda?.competencia === c.id && esTalento;
                              return (
                                <td key={c.id} className="px-2 py-2">
                                  {editando ? (
                                    <select
                                      autoFocus
                                      aria-label={`Nivel meta de ${c.nombre} en ${p.nombre}`}
                                      defaultValue={valor ?? ""}
                                      disabled={guardarNivel.isPending}
                                      onBlur={() => setCelda(null)}
                                      onChange={(e) =>
                                        guardarNivel.mutate({
                                          puestoId: p.id,
                                          competenciaId: c.id,
                                          valor: Number(e.target.value),
                                        })
                                      }
                                      className="cifra h-10 w-14 border border-border bg-card px-1 text-[13px] text-grafito"
                                    >
                                      <option value="" disabled>
                                        —
                                      </option>
                                      {NIVELES.map((n) => (
                                        <option key={n} value={n}>
                                          {n}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={!esTalento}
                                      onClick={() => setCelda({ puesto: p.id, competencia: c.id })}
                                      className="cifra h-10 w-14 border border-transparent text-grafito hover:border-border disabled:cursor-default"
                                    >
                                      {valor ?? "—"}
                                    </button>
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-3 py-2">
                              {perfil.validado ? (
                                <span className="text-linea">
                                  Validado
                                  <span className="cifra block text-[11px] text-cota">
                                    {fechaCorta(perfil.fecha_validacion)}
                                  </span>
                                </span>
                              ) : (
                                <div className="flex flex-col items-start gap-1">
                                  <span className="text-casco">Propuesto</span>
                                  {esTalento ? (
                                    <Button
                                      variant="outline"
                                      onClick={() => setPorValidar(p.id)}
                                      className="h-9 rounded-none text-[12px]"
                                    >
                                      Validar perfil
                                    </Button>
                                  ) : null}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Tarjetas — móvil */}
                <div className="space-y-3 md:hidden">
                  {puestos.map((p) => {
                    const perfil = leerPerfil(p.perfil_competencias);
                    return (
                      <article key={p.id} className="border border-border bg-card p-4">
                        <h3 className="text-[14px] font-semibold text-grafito">{p.nombre}</h3>
                        <p className="cifra text-[11px] uppercase tracking-wide text-cota">
                          {p.nivel_organizacional ?? "—"} ·{" "}
                          {perfil.validado
                            ? `Validado ${fechaCorta(perfil.fecha_validacion)}`
                            : "Propuesto"}
                        </p>
                        {!perfil.validado ? <AvisoPropuesto className="mt-2" /> : null}
                        <dl className="mt-3 divide-y divide-border text-[13px]">
                          {competencias.map((c) => (
                            <div key={c.id} className="flex items-center justify-between gap-3 py-1.5">
                              <dt className="min-w-0 truncate text-cota">{c.nombre}</dt>
                              <dd className="cifra text-grafito">{perfil.niveles[c.id] ?? "—"}</dd>
                            </div>
                          ))}
                        </dl>
                        {esTalento && !perfil.validado ? (
                          <Button
                            variant="outline"
                            onClick={() => setPorValidar(p.id)}
                            className="mt-3 h-10 w-full rounded-none text-[12px]"
                          >
                            Validar perfil
                          </Button>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>
        ) : null}
      </Tabs>

      <Sheet open={!!competenciaAbierta} onOpenChange={(v) => !v && setAbierta(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {competenciaAbierta ? (
            <>
              <SheetHeader>
                <SheetTitle className="text-grafito">{competenciaAbierta.nombre}</SheetTitle>
                <SheetDescription className="text-[13px] text-cota">
                  {competenciaAbierta.descripcion}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-3 px-4 pb-6">
                {miPerfil && !miPerfil.validado ? <AvisoPropuesto /> : null}
                <EscaleraCompetencia
                  niveles={nivelesDe(competenciaAbierta.id)}
                  nivelMeta={miPerfil?.validado ? miPerfil.niveles[competenciaAbierta.id] : null}
                  nivelObservado={
                    miPerfil?.validado ? (mio?.observados[competenciaAbierta.id] ?? null) : null
                  }
                />
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!puestoAValidar} onOpenChange={(v) => !v && setPorValidar(null)}>
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Validar el perfil de {puestoAValidar?.nombre}</AlertDialogTitle>
            <AlertDialogDescription>
              A partir de este momento los niveles meta de este puesto dejan de ser una propuesta y se
              usarán como línea base de las evaluaciones de desempeño y de los scorecards de selección.
              Podrás seguir ajustando niveles, pero cada cambio quedará registrado en la bitácora.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-10 rounded-none">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="h-10 rounded-none"
              onClick={() => porValidar && validarPerfil.mutate(porValidar)}
            >
              Validar perfil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
