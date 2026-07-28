import { cn } from "@/lib/utils";
import { numero } from "@/lib/nexus/formato";

export interface BandaLineaBaseProps {
  valor: number;
  meta: number;
  min: number;
  max: number;
  unidad?: string;
  sentido?: "mayorEsMejor" | "menorEsMejor";
  etiquetaMeta?: string;
  decimales?: number;
  className?: string;
}

/**
 * Banda de Línea Base — elemento firma de Nexus.
 * Regla del rango del indicador, marca fija de la meta, marcador del valor real
 * y el tramo entre ambos coloreado según cumplimiento.
 */
export function BandaLineaBase({
  valor,
  meta,
  min,
  max,
  unidad = "",
  sentido = "mayorEsMejor",
  etiquetaMeta = "Línea base",
  decimales = 1,
  className,
}: BandaLineaBaseProps) {
  const rango = max - min || 1;
  const pos = (v: number) => Math.min(100, Math.max(0, ((v - min) / rango) * 100));
  const pValor = pos(valor);
  const pMeta = pos(meta);
  const cumple = sentido === "mayorEsMejor" ? valor >= meta : valor <= meta;
  const desviacion = valor - meta;
  const signo = desviacion > 0 ? "+" : desviacion < 0 ? "−" : "±";
  const izq = Math.min(pValor, pMeta);
  const ancho = Math.abs(pValor - pMeta);

  return (
    <div className={cn("w-full", className)}>
      <div className="relative h-6">
        {/* regla del rango */}
        <div className="absolute top-1/2 h-[3px] w-full -translate-y-1/2 bg-cota/20" />
        {/* tramo de desviación */}
        <div
          className={cn(
            "absolute top-1/2 h-[3px] -translate-y-1/2 transition-all duration-150",
            cumple ? "bg-linea" : "bg-desviacion",
          )}
          style={{ left: `${izq}%`, width: `${ancho}%` }}
        />
        {/* marca de meta */}
        <div
          className="absolute top-0 h-6 w-px bg-grafito"
          style={{ left: `${pMeta}%` }}
          aria-hidden
        />
        {/* marcador del valor real */}
        <div
          className={cn(
            "absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 border-2 border-card transition-all duration-150",
            cumple ? "bg-linea" : "bg-desviacion",
          )}
          style={{ left: `${pValor}%` }}
          aria-hidden
        />
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <span className="cifra text-[11px] uppercase tracking-wide text-cota">
          {etiquetaMeta} {numero(meta, decimales)}
          {unidad}
        </span>
        <span
          className={cn("cifra text-[11px]", cumple ? "text-linea" : "text-desviacion")}
          aria-label={`Desviación contra ${etiquetaMeta}`}
        >
          {signo}
          {numero(Math.abs(desviacion), decimales)}
          {unidad}
        </span>
      </div>
    </div>
  );
}