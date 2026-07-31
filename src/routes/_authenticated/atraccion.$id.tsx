import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { fechaCorta, iniciales, numero } from "@/lib/nexus/formato";
import { colorDiasAbierta, diasAbierta, diasDesde, pesos } from "@/lib/nexus/atraccion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/atraccion/$id")({
  head: () => ({
    meta: [
      { title: "Expediente de vacante — ESCALA Nexus" },
      {
        name: "description",
        content: "Datos de la vacante, embudo de candidatos por fase y tiempo de cobertura contra su meta.",
      },
      { property: "og:title", content: "Expediente de vacante — ESCALA Nexus" },
      { property: "og:description", content: "Expediente de la vacante en Nexus." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExpedienteVacante,
});

function ExpedienteVacante() {
  const { id } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["vacante", id],
    queryFn: async () => {
      const [vacante, candidatos, fases, puestos, proyectos, colaboradores] = await Promise.all([
        supabase.from("vacantes").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("candidatos")
          .select("id, nombre, fuente, fase_id, fecha_ingreso_fase, estatus, motivo_descarte")
          .eq("vacante_id", id)
          .order("nombre"),
        supabase.from("fases_proceso").select("id, nombre, orden, sla_dias").eq("activa", true).order("orden"),
        supabase.from("puestos").select("id, nombre"),
        supabase.from("proyectos").select("id, nombre, ciudad"),
        supabase.from("colaboradores").select("id, nombre"),
      ]);
      return {
        vacante: vacante.data,
        candidatos: candidatos.data ?? [],
        fases: fases.data ?? [],
        puestos: puestos.data ?? [],
        proyectos: proyectos.data ?? [],
        colaboradores: colaboradores.data ?? [],
      };
    },
  });

  if (isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40 rounded-none" />
        <Skeleton className="h-24 rounded-none" />
        <Skeleton className="h-64 rounded-none" />
      </div>
    );

  const v = data?.vacante;
  if (!v)
    return (
      <div className="border border-dashed border-border bg-card p-8">
        <p className="text-[13px] text-cota">Esta vacante no existe o no tienes acceso a ella.</p>
        <Link to="/atraccion" className="mt-3 inline-block text-[13px] text-plomada underline">
          Volver a Atracción
        </Link>
      </div>
    );

  const puesto = data.puestos.find((p) => p.id === v.puesto_id)?.nombre ?? "Puesto sin asignar";
  const proyecto = data.proyectos.find((p) => p.id === v.proyecto_id);
  const hm = data.colaboradores.find((c) => c.id === v.hiring_manager_id)?.nombre ?? "Sin asignar";
  const dias = diasAbierta(v);
  const activos = data.candidatos.filter((c) => c.estatus !== "descartado");
  const conteos = data.fases.map((f) => ({
    fase: f,
    total: activos.filter((c) => c.fase_id === f.id).length,
  }));
  const maximo = Math.max(1, ...conteos.map((c) => c.total));
  const nombreFase = (faseId: string | null) =>
    data.fases.find((f) => f.id === faseId)?.nombre ?? "Sin fase";

  return (
    <div className="space-y-5">
      <Link to="/atraccion" className="inline-flex items-center gap-1 text-[13px] text-cota hover:text-plomada">
        <ArrowLeft className="h-4 w-4" /> Atracción
      </Link>

      <header className="grid gap-3 border border-border bg-card p-4 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl text-grafito">{puesto}</h1>
          <p className="mt-1 text-[13px] text-cota">
            {proyecto ? `${proyecto.nombre} · ${proyecto.ciudad ?? ""}`.trim() : "Corporativo"} ·{" "}
            <span className="capitalize">{v.estatus}</span>
          </p>
        </div>
        <p className="shrink-0 text-right">
          <span
            className={cn(
              "cifra text-3xl leading-none",
              colorDiasAbierta(dias, v.fecha_apertura, v.fecha_meta_cobertura),
            )}
          >
            {dias ?? "—"}
          </span>
          <span className="ml-1 text-[12px] text-cota">días abierta</span>
        </p>
      </header>

      <section className="border border-border bg-card p-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-cota">Datos de la vacante</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Hiring manager", hm],
            ["Motivo", v.motivo ?? "—"],
            [
              "Rango salarial",
              v.salario_min && v.salario_max
                ? `${pesos(Number(v.salario_min))} — ${pesos(Number(v.salario_max))}`
                : "[Dato Requerido de Escala]",
            ],
            ["Fecha de apertura", fechaCorta(v.fecha_apertura)],
            ["Meta de cobertura", fechaCorta(v.fecha_meta_cobertura)],
            ["Cierre real", fechaCorta(v.fecha_cierre_real)],
            [
              "Costo por día de vacancia",
              v.costo_vacante_dia !== null ? pesos(Number(v.costo_vacante_dia)) : "[Dato Requerido de Escala]",
            ],
            [
              "Costo de vacancia acumulado",
              v.costo_vacante_dia !== null ? pesos((dias ?? 0) * Number(v.costo_vacante_dia)) : "—",
            ],
          ].map(([k, val]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-border py-1">
              <dt className="text-cota">{k}</dt>
              <dd className="cifra text-right text-grafito">{val}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="border border-border bg-card p-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-cota">Embudo por fase</h2>
        {activos.length === 0 ? (
          <p className="mt-3 border border-dashed border-border p-6 text-center text-[13px] text-cota">
            Esta vacante aún no tiene candidatos activos. Regístralos desde Atracción › Registrar candidato.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {conteos.map((c, i) => {
              const previo = i > 0 ? conteos[i - 1].total : null;
              const conversion = previo && previo > 0 ? (c.total / previo) * 100 : null;
              return (
                <li key={c.fase.id} className="grid gap-1">
                  <div className="flex items-baseline justify-between gap-3 text-[12px]">
                    <span className="truncate text-grafito">{c.fase.nombre}</span>
                    <span className="cifra shrink-0 text-cota">
                      {c.total}
                      {conversion !== null && ` · ${numero(conversion, 0)}% conversión`}
                    </span>
                  </div>
                  <div className="h-3 w-full bg-cota/15">
                    <div
                      className="h-3 bg-plomada"
                      style={{ width: `${(c.total / maximo) * 100}%` }}
                      aria-hidden
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="border border-border bg-card p-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-cota">
          Candidatos ({data.candidatos.length})
        </h2>
        {data.candidatos.length === 0 ? (
          <p className="mt-3 border border-dashed border-border p-6 text-center text-[13px] text-cota">
            Sin candidatos registrados para esta vacante.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {data.candidatos.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2">
                <span className="cifra grid h-8 w-8 shrink-0 place-items-center bg-plomada text-[10px] text-primary-foreground">
                  {iniciales(c.nombre)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-grafito">{c.nombre}</p>
                  <p className="truncate text-[11px] text-cota">
                    {c.estatus === "descartado"
                      ? `Descartado · ${c.motivo_descarte ?? "sin motivo"}`
                      : `${nombreFase(c.fase_id)} · ${c.fuente ?? "fuente sin registrar"}`}
                  </p>
                </div>
                <span className="cifra shrink-0 text-[12px] text-cota">
                  {diasDesde(c.fecha_ingreso_fase) ?? "—"} d en fase
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}