import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, MessageSquareText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { GuiaSbi } from "@/components/nexus/desempeno/guia-sbi";
import { leerPerfil } from "@/lib/nexus/desempeno";
import {
  AVISO_CONFIDENCIAL,
  EJEMPLO_EVIDENCIA,
  EVIDENCIA_MINIMA,
  FRASE_CRITERIO,
} from "@/lib/nexus/evaluacion";
import { fechaCorta } from "@/lib/nexus/formato";
import { cn } from "@/lib/utils";

interface Respuesta {
  nivel: number | null;
  evidencia: string;
  filaId: string | null;
}

export function MiEvaluacion({ colaboradorId }: { colaboradorId: string | null }) {
  const queryClient = useQueryClient();
  const [evaluacionId, setEvaluacionId] = useState<string | null>(null);
  const [paso, setPaso] = useState(0);
  const [borrador, setBorrador] = useState<Record<string, Respuesta>>({});
  const [guia, setGuia] = useState<{ id: string; nombre: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["mis-evaluaciones", colaboradorId],
    enabled: !!colaboradorId,
    retry: 3,
    queryFn: async () => {
      const [evaluaciones, competencias, niveles, comportamientos] = await Promise.all([
        supabase
          .from("evaluaciones")
          .select(
            "id, ciclo_id, colaborador_id, relacion, estatus, ciclos_evaluacion(nombre, estatus, fecha_fin), colaboradores!evaluaciones_colaborador_id_fkey(nombre, puesto_id)",
          )
          .eq("evaluador_id", colaboradorId as string),
        supabase.from("competencias").select("id, nombre, descripcion, grupo, orden").order("orden"),
        supabase
          .from("niveles_competencia")
          .select("id, competencia_id, nivel, etiqueta, descripcion, resumen")
          .order("nivel"),
        supabase.from("comportamientos").select("id, nivel_competencia_id, texto, orden").order("orden"),
      ]);
      const puestoIds = Array.from(
        new Set(
          (evaluaciones.data ?? [])
            .map((e) => e.colaboradores?.puesto_id)
            .filter((x): x is string => !!x),
        ),
      );
      const puestos = puestoIds.length
        ? (await supabase.from("puestos").select("id, nombre, perfil_competencias").in("id", puestoIds))
            .data ?? []
        : [];
      return {
        evaluaciones: evaluaciones.data ?? [],
        competencias: competencias.data ?? [],
        niveles: niveles.data ?? [],
        comportamientos: comportamientos.data ?? [],
        puestos,
      };
    },
  });

  const evaluacion = useMemo(
    () => (data?.evaluaciones ?? []).find((e) => e.id === evaluacionId) ?? null,
    [data?.evaluaciones, evaluacionId],
  );

  const { data: respuestas } = useQuery({
    queryKey: ["respuestas-evaluacion", evaluacionId],
    enabled: !!evaluacionId,
    queryFn: async () =>
      (
        await supabase
          .from("evaluacion_competencias")
          .select("id, competencia_id, nivel_observado, evidencia")
          .eq("evaluacion_id", evaluacionId as string)
      ).data ?? [],
  });

  useEffect(() => {
    if (!respuestas) return;
    const inicial: Record<string, Respuesta> = {};
    for (const r of respuestas) {
      if (r.competencia_id) {
        inicial[r.competencia_id] = {
          nivel: r.nivel_observado,
          evidencia: r.evidencia ?? "",
          filaId: r.id,
        };
      }
    }
    setBorrador(inicial);
  }, [respuestas]);

  const competencias = data?.competencias ?? [];
  const total = competencias.length;
  const competencia = competencias[paso] ?? null;
  const actual = competencia ? borrador[competencia.id] : undefined;

  const puesto = (data?.puestos ?? []).find((p) => p.id === evaluacion?.colaboradores?.puesto_id);
  const perfil = puesto ? leerPerfil(puesto.perfil_competencias) : null;
  const nivelMeta =
    perfil?.validado && competencia ? (perfil.niveles[competencia.id] ?? null) : null;

  const guardar = useMutation({
    mutationFn: async ({
      competenciaId,
      respuesta,
    }: {
      competenciaId: string;
      respuesta: Respuesta;
    }) => {
      if (!evaluacionId) throw new Error("sin evaluación");
      if (respuesta.filaId) {
        const { error } = await supabase
          .from("evaluacion_competencias")
          .update({ nivel_observado: respuesta.nivel, evidencia: respuesta.evidencia })
          .eq("id", respuesta.filaId);
        if (error) throw error;
        return respuesta.filaId;
      }
      const { data: fila, error } = await supabase
        .from("evaluacion_competencias")
        .insert({
          evaluacion_id: evaluacionId,
          competencia_id: competenciaId,
          nivel_observado: respuesta.nivel,
          evidencia: respuesta.evidencia,
        })
        .select("id")
        .single();
      if (error) throw error;
      return fila.id;
    },
    onSuccess: (filaId, vars) => {
      setBorrador((b) => ({ ...b, [vars.competenciaId]: { ...vars.respuesta, filaId } }));
    },
    onError: () => toast.error("No se guardó la respuesta. Verifica que la evaluación sea tuya."),
  });

  const enviar = useMutation({
    mutationFn: async () => {
      if (!evaluacionId) throw new Error("sin evaluación");
      const { error } = await supabase
        .from("evaluaciones")
        .update({ estatus: "completado" })
        .eq("id", evaluacionId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evaluación enviada en firme");
      queryClient.invalidateQueries({ queryKey: ["mis-evaluaciones"] });
      queryClient.invalidateQueries({ queryKey: ["ciclos-desempeno"] });
      queryClient.invalidateQueries({ queryKey: ["desempeno-indicadores"] });
    },
    onError: () => toast.error("No se envió la evaluación. Vuelve a intentar."),
  });

  const puedeAvanzar =
    !!actual && actual.nivel !== null && actual.evidencia.trim().length >= EVIDENCIA_MINIMA;

  const guardarYAvanzar = async (destino: number) => {
    if (competencia && puedeAvanzar && actual) {
      await guardar.mutateAsync({ competenciaId: competencia.id, respuesta: actual });
    }
    setPaso(destino);
  };

  if (!colaboradorId) {
    return (
      <p className="border border-dashed border-border p-6 text-center text-[13px] text-cota">
        Tu usuario aún no está ligado a un expediente de colaborador. Pide a Dirección de Talento que
        lo vincule para poder evaluar.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-none" />
        <Skeleton className="h-64 w-full rounded-none" />
      </div>
    );
  }

  const pendientes = (data?.evaluaciones ?? []).filter((e) => e.estatus !== "completado");
  const completadas = (data?.evaluaciones ?? []).filter((e) => e.estatus === "completado");

  if (!evaluacion) {
    return (
      <div className="space-y-4">
        <p className="border-l-2 border-casco bg-casco/10 px-3 py-2 text-[12px] text-grafito">
          {AVISO_CONFIDENCIAL}
        </p>
        <section className="space-y-2">
          <h3 className="cifra text-[11px] font-semibold uppercase tracking-wide text-cota">
            Evaluaciones pendientes ({pendientes.length})
          </h3>
          {pendientes.length === 0 ? (
            <p className="border border-dashed border-border p-6 text-center text-[13px] text-cota">
              No tienes evaluaciones pendientes. Cuando Dirección de Talento abra un ciclo aparecerán
              aquí.
            </p>
          ) : (
            <ul className="divide-y divide-border border border-border bg-card">
              {pendientes.map((e) => (
                <li key={e.id} className="grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-grafito">
                      {e.relacion === "auto" ? "Autoevaluación" : e.colaboradores?.nombre}
                    </p>
                    <p className="cifra text-[11px] uppercase tracking-wide text-cota">
                      {e.ciclos_evaluacion?.nombre} · {e.relacion} · cierra{" "}
                      {fechaCorta(e.ciclos_evaluacion?.fecha_fin)}
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setEvaluacionId(e.id);
                      setPaso(0);
                    }}
                    className="h-12 rounded-none text-[13px]"
                  >
                    Responder
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {completadas.length > 0 ? (
          <section className="space-y-2">
            <h3 className="cifra text-[11px] font-semibold uppercase tracking-wide text-cota">
              Evaluaciones cerradas ({completadas.length})
            </h3>
            <ul className="divide-y divide-border border border-border bg-card">
              {completadas.map((e) => (
                <li key={e.id} className="grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-grafito">
                      {e.relacion === "auto" ? "Autoevaluación" : e.colaboradores?.nombre}
                    </p>
                    <p className="cifra text-[11px] uppercase tracking-wide text-cota">
                      {e.ciclos_evaluacion?.nombre} · {e.relacion}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setGuia({
                        id: e.id,
                        nombre:
                          e.relacion === "auto"
                            ? "Autoevaluación"
                            : (e.colaboradores?.nombre ?? "Colaborador"),
                      })
                    }
                    className="h-12 rounded-none text-[13px]"
                  >
                    <MessageSquareText className="mr-1 h-4 w-4" /> Guía de conversación SBI
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <GuiaSbi
          evaluacionId={guia?.id ?? null}
          nombreEvaluado={guia?.nombre ?? ""}
          onOpenChange={(v) => !v && setGuia(null)}
        />
      </div>
    );
  }

  const nombreEvaluado =
    evaluacion.relacion === "auto"
      ? "Autoevaluación"
      : (evaluacion.colaboradores?.nombre ?? "Colaborador");

  // Pantalla de revisión
  if (paso >= total) {
    const faltan = competencias.filter(
      (c) =>
        !borrador[c.id] ||
        borrador[c.id]?.nivel === null ||
        (borrador[c.id]?.evidencia.trim().length ?? 0) < EVIDENCIA_MINIMA,
    );
    return (
      <div className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[14px] font-semibold text-grafito">Revisión — {nombreEvaluado}</h3>
          <Button
            variant="outline"
            onClick={() => setPaso(total - 1)}
            className="h-12 rounded-none text-[13px]"
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Volver a editar
          </Button>
        </header>
        <ul className="divide-y divide-border border border-border bg-card">
          {competencias.map((c) => (
            <li key={c.id} className="p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-semibold text-grafito">{c.nombre}</span>
                <span className="cifra text-[11px] uppercase tracking-wide text-cota">
                  Nivel {borrador[c.id]?.nivel ?? "—"}
                </span>
              </div>
              <p className="mt-1 text-[13px] leading-snug text-cota">
                {borrador[c.id]?.evidencia || "Sin evidencia capturada."}
              </p>
            </li>
          ))}
        </ul>
        {faltan.length > 0 ? (
          <p className="border-l-2 border-desviacion bg-desviacion/10 px-3 py-2 text-[13px] text-grafito">
            Faltan {faltan.length} competencias con nivel y evidencia de al menos {EVIDENCIA_MINIMA}{" "}
            caracteres: {faltan.map((c) => c.nombre).join(", ")}.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={faltan.length > 0 || enviar.isPending}
            onClick={() => enviar.mutate()}
            className="h-12 rounded-none text-[13px]"
          >
            Enviar en firme
          </Button>
          <Button
            variant="outline"
            onClick={() => setEvaluacionId(null)}
            className="h-12 rounded-none text-[13px]"
          >
            Salir
          </Button>
        </div>
      </div>
    );
  }

  const nivelesDeCompetencia = (data?.niveles ?? []).filter(
    (n) => n.competencia_id === competencia?.id,
  );

  return (
    <div className="space-y-4">
      <p className="border-l-2 border-casco bg-casco/10 px-3 py-2 text-[12px] text-grafito">
        {AVISO_CONFIDENCIAL}
      </p>

      <header className="space-y-2 border border-border bg-card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="cifra text-[12px] uppercase tracking-wide text-cota">
            Competencia {paso + 1} de {total}
          </span>
          <span className="cifra text-[12px] text-cota">{nombreEvaluado}</span>
        </div>
        <div className="h-[3px] w-full bg-cota/20">
          <div
            className="h-[3px] bg-grafito transition-all duration-150"
            style={{ width: `${((paso + 1) / Math.max(total, 1)) * 100}%` }}
          />
        </div>
      </header>

      {competencia ? (
        <section className="space-y-3 border border-border bg-card p-4">
          <div>
            <h3 className="text-lg text-grafito">{competencia.nombre}</h3>
            <p className="mt-1 text-[13px] leading-snug text-cota">{competencia.descripcion}</p>
          </div>
          <p className="cifra border-l-2 border-grafito px-3 py-1 text-[12px] text-grafito">
            {FRASE_CRITERIO}
          </p>
          {nivelMeta ? (
            <p className="cifra text-[11px] uppercase tracking-wide text-cota">
              Nivel meta del puesto {nivelMeta}
            </p>
          ) : null}

          <ul className="space-y-2">
            {nivelesDeCompetencia.map((n) => {
              const elegido = actual?.nivel === n.nivel;
              const comps = (data?.comportamientos ?? []).filter(
                (c) => c.nivel_competencia_id === n.id,
              );
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setBorrador((b) => ({
                        ...b,
                        [competencia.id]: {
                          nivel: n.nivel,
                          evidencia: b[competencia.id]?.evidencia ?? "",
                          filaId: b[competencia.id]?.filaId ?? null,
                        },
                      }))
                    }
                    className={cn(
                      "min-h-12 w-full border border-border bg-card p-3 text-left transition-colors hover:border-grafito",
                      elegido && "border-l-2 border-l-grafito bg-cota/5",
                      nivelMeta === n.nivel && "border-dashed",
                    )}
                  >
                    <span className="flex items-baseline gap-2">
                      <span className="cifra text-lg leading-none text-grafito">{n.nivel}</span>
                      <span className="text-[13px] font-semibold text-grafito">
                        {n.etiqueta ?? "—"}
                      </span>
                      {nivelMeta === n.nivel ? (
                        <span className="cifra ml-auto text-[11px] uppercase tracking-wide text-cota">
                          Meta del puesto
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-[13px] leading-snug text-cota">
                      {n.descripcion ?? n.resumen ?? "—"}
                    </span>
                    {comps.length > 0 ? (
                      <span className="mt-2 block border-t border-border pt-2 text-[13px] text-cota">
                        {comps.map((c) => (
                          <span key={c.id} className="block">
                            · {c.texto}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="space-y-1.5">
            <label
              htmlFor="evidencia"
              className="cifra text-[11px] uppercase tracking-wide text-cota"
            >
              Evidencia obligatoria
            </label>
            <Textarea
              id="evidencia"
              rows={4}
              value={actual?.evidencia ?? ""}
              onChange={(e) =>
                setBorrador((b) => ({
                  ...b,
                  [competencia.id]: {
                    nivel: b[competencia.id]?.nivel ?? null,
                    evidencia: e.target.value,
                    filaId: b[competencia.id]?.filaId ?? null,
                  },
                }))
              }
              className="rounded-none text-[13px]"
            />
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span
                className={cn(
                  "cifra text-[11px]",
                  (actual?.evidencia.trim().length ?? 0) >= EVIDENCIA_MINIMA
                    ? "text-linea"
                    : "text-desviacion",
                )}
              >
                {actual?.evidencia.trim().length ?? 0} de {EVIDENCIA_MINIMA} caracteres mínimos
              </span>
              <span className="cifra text-[11px] text-cota">
                Sin evidencia no se guarda la calificación.
              </span>
            </div>
            <p className="border-l-2 border-casco bg-casco/10 px-3 py-2 text-[12px] leading-snug text-grafito">
              {EJEMPLO_EVIDENCIA}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            <Button
              variant="outline"
              disabled={paso === 0}
              onClick={() => setPaso((p) => Math.max(0, p - 1))}
              className="h-12 rounded-none text-[13px]"
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
            </Button>
            <Button
              disabled={!puedeAvanzar || guardar.isPending}
              onClick={() => void guardarYAvanzar(paso + 1)}
              className="h-12 rounded-none text-[13px]"
            >
              {paso + 1 === total ? "Revisar" : "Siguiente"}{" "}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setEvaluacionId(null)}
              className="h-12 rounded-none text-[13px]"
            >
              Guardar y salir
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}