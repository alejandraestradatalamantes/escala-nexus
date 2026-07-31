import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { BandaLineaBase } from "@/components/nexus/banda-linea-base";
import { leerPerfil } from "@/lib/nexus/desempeno";
import {
  AVISO_CONFIDENCIAL,
  AVISO_PERFIL_PENDIENTE_ENLACE,
  ETIQUETA_TIPO_OBJETIVO,
  cumplimiento,
  datosCasilla,
} from "@/lib/nexus/evaluacion";
import { numero } from "@/lib/nexus/formato";

/** Historial de desempeño del expediente: evolución por ciclo, 9-Box y objetivos. */
export function HistorialDesempeno({
  colaboradorId,
  puestoId,
}: {
  colaboradorId: string;
  puestoId: string | null;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["historial-desempeno", colaboradorId],
    retry: 3,
    queryFn: async () => {
      const [competencias, ciclos, evaluaciones, mapeo, objetivos, puesto] = await Promise.all([
        supabase.from("competencias").select("id, nombre, orden").order("orden"),
        supabase
          .from("ciclos_evaluacion")
          .select("id, nombre, estatus, fecha_inicio")
          .order("fecha_inicio"),
        supabase
          .from("evaluaciones")
          .select("id, ciclo_id, relacion, estatus")
          .eq("colaborador_id", colaboradorId),
        supabase.from("mapeo_talento").select("*").eq("colaborador_id", colaboradorId),
        supabase.from("objetivos").select("*").eq("colaborador_id", colaboradorId),
        puestoId
          ? supabase
              .from("puestos")
              .select("id, nombre, perfil_competencias")
              .eq("id", puestoId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      const evalIds = (evaluaciones.data ?? []).map((e) => e.id);
      const respuestas = evalIds.length
        ? ((
            await supabase
              .from("evaluacion_competencias")
              .select("evaluacion_id, competencia_id, nivel_observado")
              .in("evaluacion_id", evalIds)
          ).data ?? [])
        : [];
      return {
        competencias: competencias.data ?? [],
        ciclos: ciclos.data ?? [],
        evaluaciones: evaluaciones.data ?? [],
        mapeo: mapeo.data ?? [],
        objetivos: objetivos.data ?? [],
        puesto: puesto.data ?? null,
        respuestas,
      };
    },
  });

  const perfil = data?.puesto ? leerPerfil(data.puesto.perfil_competencias) : null;

  const serie = useMemo(() => {
    if (!data) return [];
    const ciclosConDatos = data.ciclos.filter((ci) =>
      data.evaluaciones.some((e) => e.ciclo_id === ci.id && e.estatus === "completado"),
    );
    return ciclosConDatos.map((ci) => {
      const ids = data.evaluaciones.filter((e) => e.ciclo_id === ci.id).map((e) => e.id);
      const fila: Record<string, string | number> = { ciclo: ci.nombre };
      for (const c of data.competencias) {
        const valores = data.respuestas
          .filter((r) => ids.includes(r.evaluacion_id) && r.competencia_id === c.id)
          .map((r) => r.nivel_observado)
          .filter((v): v is number => typeof v === "number");
        if (valores.length > 0) {
          fila[c.nombre] = valores.reduce((s, v) => s + v, 0) / valores.length;
        }
      }
      if (perfil?.validado) {
        const metas = data.competencias
          .map((c) => perfil.niveles[c.id])
          .filter((v): v is number => typeof v === "number");
        if (metas.length > 0) {
          fila["Nivel meta del puesto"] = metas.reduce((s, v) => s + v, 0) / metas.length;
        }
      }
      return fila;
    });
  }, [data, perfil]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-64 w-full rounded-none" />
        <Skeleton className="h-32 w-full rounded-none" />
      </div>
    );
  }

  const colores = [
    "var(--color-plomada)",
    "var(--color-linea)",
    "var(--color-desviacion)",
    "var(--color-casco)",
    "var(--color-cota)",
    "var(--color-grafito)",
    "oklch(0.55 0.09 300)",
    "oklch(0.62 0.10 140)",
  ];

  const ultimoCicloCerrado = (data?.ciclos ?? [])
    .filter((c) => c.estatus === "cerrado")
    .slice(-1)[0];
  const objetivosUltimo = (data?.objetivos ?? []).filter(
    (o) => o.ciclo_id === ultimoCicloCerrado?.id,
  );
  const cumpl = cumplimiento(objetivosUltimo);

  return (
    <div className="space-y-5">
      <p className="border-l-2 border-casco bg-casco/10 px-3 py-2 text-[12px] text-grafito">
        {AVISO_CONFIDENCIAL}
      </p>

      <section>
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-cota">
          Evolución de competencias por ciclo
        </h3>
        {!perfil?.validado ? (
          <p className="mt-2 border-l-2 border-casco bg-casco/10 px-3 py-2 text-[12px] text-grafito">
            {AVISO_PERFIL_PENDIENTE_ENLACE}
          </p>
        ) : null}
        {serie.length === 0 ? (
          <p className="mt-2 border border-dashed border-border p-6 text-center text-[13px] text-cota">
            Aún no hay evaluaciones completadas para graficar.
          </p>
        ) : (
          <div className="mt-2 h-80 border border-border bg-card p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serie} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
                <CartesianGrid
                  strokeDasharray="2 4"
                  stroke="currentColor"
                  className="text-cota/20"
                />
                <XAxis dataKey="ciclo" tick={{ fontSize: 11 }} />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 0, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {(data?.competencias ?? []).map((c, i) => (
                  <Line
                    key={c.id}
                    type="monotone"
                    dataKey={c.nombre}
                    stroke={colores[i % colores.length]}
                    strokeWidth={1.5}
                    dot={{ r: 2 }}
                  />
                ))}
                {perfil?.validado ? (
                  <Line
                    type="monotone"
                    dataKey="Nivel meta del puesto"
                    stroke="var(--color-grafito)"
                    strokeDasharray="4 3"
                    strokeWidth={2}
                    dot={false}
                  />
                ) : null}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section>
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-cota">
          Posiciones históricas en el 9-Box
        </h3>
        {(data?.mapeo ?? []).length === 0 ? (
          <p className="mt-2 text-[13px] text-cota">Sin calibraciones registradas.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border border border-border bg-card text-[13px]">
            {(data?.mapeo ?? []).map((m) => {
              const info =
                typeof m.eje_desempeno === "number" && typeof m.eje_potencial === "number"
                  ? datosCasilla(m.eje_desempeno, m.eje_potencial)
                  : null;
              const ciclo = (data?.ciclos ?? []).find((c) => c.id === m.ciclo_id);
              return (
                <li key={m.id} className="p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-grafito">{ciclo?.nombre ?? "Ciclo sin nombre"}</span>
                    <span className="cifra text-[11px] uppercase tracking-wide text-cota">
                      {info?.nombre ?? "—"} · D{m.eje_desempeno} / P{m.eje_potencial} · riesgo{" "}
                      {m.riesgo_salida ?? "—"}
                    </span>
                  </div>
                  {m.acuerdos ? (
                    <p className="mt-1 text-[13px] leading-snug text-cota">{m.acuerdos}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-cota">
          Objetivos del último ciclo cerrado
        </h3>
        {objetivosUltimo.length === 0 ? (
          <p className="mt-2 text-[13px] text-cota">Sin objetivos capturados.</p>
        ) : (
          <>
            {cumpl !== null ? (
              <div className="mt-2 max-w-sm">
                <BandaLineaBase
                  valor={cumpl}
                  meta={100}
                  min={0}
                  max={100}
                  unidad="%"
                  etiquetaMeta="Meta"
                  decimales={0}
                />
              </div>
            ) : null}
            <ul className="mt-2 divide-y divide-border border border-border bg-card text-[13px]">
              {objetivosUltimo.map((o) => (
                <li key={o.id} className="grid gap-1 p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <span className="min-w-0 text-grafito">{o.descripcion}</span>
                  <span className="cifra text-[11px] uppercase tracking-wide text-cota">
                    {ETIQUETA_TIPO_OBJETIVO[o.tipo ?? ""] ?? o.tipo ?? "—"} · peso{" "}
                    {numero(o.peso, 0)}% · {numero(o.real, 1)} de {numero(o.meta, 1)}{" "}
                    {o.unidad ?? ""}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
