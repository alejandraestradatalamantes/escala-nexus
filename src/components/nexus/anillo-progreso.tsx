import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { TONO, type EstadoIndicador } from "@/lib/nexus/estado-indicador";

interface Props {
  /** Avance contra la meta, 0 a 1 (puede pasar de 1: se recorta el trazo). */
  progreso: number;
  estado: EstadoIndicador;
  etiqueta?: string;
  tamano?: number;
  className?: string;
}

/** Anillo de progreso contra meta. Reemplaza a la regla lineal en las tarjetas. */
export function AnilloProgreso({ progreso, estado, etiqueta, tamano = 68, className }: Props) {
  const grosor = 7;
  const r = (tamano - grosor) / 2;
  const c = 2 * Math.PI * r;
  const objetivo = Math.max(0, Math.min(1, progreso));
  const [dibujado, setDibujado] = useState(0);
  const montado = useRef(false);

  useEffect(() => {
    const reducido =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reducido || !montado.current) {
      montado.current = true;
      const id = requestAnimationFrame(() => setDibujado(objetivo));
      return () => cancelAnimationFrame(id);
    }
    setDibujado(objetivo);
  }, [objetivo]);

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: tamano, height: tamano }}>
      <svg width={tamano} height={tamano} className="-rotate-90" aria-hidden>
        <circle
          cx={tamano / 2}
          cy={tamano / 2}
          r={r}
          fill="none"
          strokeWidth={grosor}
          stroke="var(--color-border)"
        />
        <circle
          cx={tamano / 2}
          cy={tamano / 2}
          r={r}
          fill="none"
          strokeWidth={grosor}
          strokeLinecap="round"
          stroke={TONO[estado].trazo}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - dibujado)}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <span
        className={cn(
          "cifra absolute inset-0 flex items-center justify-center text-[12px] font-semibold",
          TONO[estado].texto,
        )}
      >
        {etiqueta ?? `${Math.round(progreso * 100)}%`}
      </span>
    </div>
  );
}