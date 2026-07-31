import { cn } from "@/lib/utils";
import { numero } from "@/lib/nexus/formato";

export interface NivelEscalera {
  nivel: number;
  etiqueta: string | null;
  descripcion: string | null;
  resumen: string | null;
  comportamientos: { id: string; texto: string; orden: number }[];
}

export interface EscaleraCompetenciaProps {
  niveles: NivelEscalera[];
  nivelMeta?: number | null;
  nivelObservado?: number | null;
  etiquetaMeta?: string;
  className?: string;
}

/**
 * Escalera de dominio con la Banda de Línea Base en vertical:
 * regla del rango, marca fija de la meta, marcador del nivel observado
 * y tramo coloreado según cumplimiento. Sin marcadores cuando falta el dato.
 */
export function EscaleraCompetencia({
  niveles,
  nivelMeta,
  nivelObservado,
  etiquetaMeta = "Nivel meta del puesto",
  className,
}: EscaleraCompetenciaProps) {
  const ordenados = [...niveles].sort((a, b) => b.nivel - a.nivel);
  const pos = (n: number) => ((5 - n) / 4) * 100;
  const hayMeta = typeof nivelMeta === "number";
  const hayObs = typeof nivelObservado === "number";
  const cumple = hayMeta && hayObs ? (nivelObservado as number) >= (nivelMeta as number) : false;
  const desviacion = hayMeta && hayObs ? (nivelObservado as number) - (nivelMeta as number) : 0;
  const signo = desviacion > 0 ? "+" : desviacion < 0 ? "−" : "±";

  return (
    <div className={cn("flex gap-4", className)}>
      {/* Banda de Línea Base vertical */}
      <div className="relative w-10 shrink-0">
        <div className="absolute inset-y-6 left-0 right-0">
          <div className="absolute left-4 top-0 h-full w-[3px] bg-cota/20" />
          {hayMeta && hayObs ? (
            <div
              className={cn(
                "absolute left-4 w-[3px] transition-all duration-150",
                cumple ? "bg-linea" : "bg-desviacion",
              )}
              style={{
                top: `${Math.min(pos(nivelMeta as number), pos(nivelObservado as number))}%`,
                height: `${Math.abs(pos(nivelMeta as number) - pos(nivelObservado as number))}%`,
              }}
              aria-hidden
            />
          ) : null}
          {hayMeta ? (
            <div
              className="absolute left-1 h-px w-8 bg-grafito"
              style={{ top: `${pos(nivelMeta as number)}%` }}
              aria-hidden
            />
          ) : null}
          {hayObs ? (
            <div
              className={cn(
                "absolute left-[17.5px] h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 border-2 border-card",
                cumple ? "bg-linea" : "bg-desviacion",
              )}
              style={{ top: `${pos(nivelObservado as number)}%` }}
              aria-hidden
            />
          ) : null}
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
          <span className="cifra text-[11px] uppercase tracking-wide text-cota">
            {etiquetaMeta} {hayMeta ? nivelMeta : "—"}
          </span>
          <span
            className={cn(
              "cifra text-[11px]",
              hayMeta && hayObs ? (cumple ? "text-linea" : "text-desviacion") : "text-cota",
            )}
          >
            {hayObs ? `Observado ${nivelObservado}` : "Sin evaluación registrada"}
            {hayMeta && hayObs ? ` · ${signo}${numero(Math.abs(desviacion), 0)}` : ""}
          </span>
        </div>

        {ordenados.map((n) => {
          const esMeta = hayMeta && n.nivel === nivelMeta;
          return (
            <article
              key={n.nivel}
              className={cn(
                "border border-border bg-card p-3",
                esMeta && "border-l-2 border-l-grafito",
              )}
            >
              <header className="flex items-baseline gap-2">
                <span className="cifra text-lg leading-none text-grafito">{n.nivel}</span>
                <span className="text-[13px] font-semibold text-grafito">{n.etiqueta ?? "—"}</span>
                {esMeta ? (
                  <span className="cifra ml-auto text-[11px] uppercase tracking-wide text-cota">
                    Meta del puesto
                  </span>
                ) : null}
              </header>
              <p className="mt-1 text-[13px] leading-snug text-grafito">{n.descripcion ?? "—"}</p>
              {n.comportamientos.length > 0 ? (
                <ul className="mt-2 space-y-1 border-t border-border pt-2 text-[13px] text-cota">
                  {n.comportamientos.map((c) => (
                    <li key={c.id} className="flex gap-2">
                      <span aria-hidden>·</span>
                      <span className="min-w-0">{c.texto}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 border-l-2 border-casco bg-casco/10 px-2 py-1 text-[11px] text-cota">
                  Comportamientos observables pendientes de importación.
                </p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}