import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Gauge } from "lucide-react";
import { BandaLineaBase, type BandaLineaBaseProps } from "./banda-linea-base";
import { InsigniaDelta } from "./insignia-delta";
import { PieTrazabilidad } from "./pie-trazabilidad";
import { numero } from "@/lib/nexus/formato";
import { cn } from "@/lib/utils";
import { TONO, estadoDe } from "@/lib/nexus/estado-indicador";

interface Props extends BandaLineaBaseProps {
  titulo: string;
  formula: string;
  fuente: string;
  fechaCorte: string;
  nota?: ReactNode;
  icono?: LucideIcon;
}

const DURACION_CONTEO_MS = 600;

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function useConteo(valorFinal: number) {
  // El estado por defecto siempre es el valor final: si la animación no puede
  // correr, la cifra visible es la real, nunca un cero falso.
  const [valor, setValor] = useState(valorFinal);
  const anterior = useRef<number | null>(null);

  useEffect(() => {
    if (!Number.isFinite(valorFinal)) {
      setValor(valorFinal);
      return;
    }

    const reducido =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reducido || typeof requestAnimationFrame === "undefined") {
      setValor(valorFinal);
      anterior.current = valorFinal;
      return;
    }

    const desde = anterior.current ?? 0;
    anterior.current = valorFinal;

    if (desde === valorFinal) {
      setValor(valorFinal);
      return;
    }

    let id: number;
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - inicio) / DURACION_CONTEO_MS);
      if (t < 1) {
        setValor(desde + (valorFinal - desde) * easeOut(t));
        id = requestAnimationFrame(paso);
      } else {
        setValor(valorFinal);
      }
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [valorFinal]);

  return valor;
}

/** Ningún indicador aparece sin fórmula, fuente y fecha de corte a un clic. */
export function TarjetaIndicador({
  titulo,
  formula,
  fuente,
  fechaCorte,
  nota,
  icono: Icono = Gauge,
  ...banda
}: Props) {
  const valorMostrado = useConteo(banda.valor);
  const decimales = banda.decimales ?? 1;
  const sentido = banda.sentido ?? "mayorEsMejor";
  const estado = estadoDe(banda.valor, banda.meta, sentido, banda.max - banda.min);
  const tono = TONO[estado];
  const desviacion = banda.valor - banda.meta;

  return (
    <article className="relative overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-tarjeta)] transition-shadow duration-200 hover:shadow-[var(--shadow-tarjeta-alta)]">
      <span className={cn("absolute inset-x-0 top-0 h-1", tono.acento)} aria-hidden />
      <div className="flex flex-col gap-4 p-5 pt-6">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
              tono.fondo,
              tono.texto,
            )}
            aria-hidden
          >
            <Icono className="h-4.5 w-4.5" />
          </span>
          <h3 className="min-w-0 flex-1 pt-1.5 text-[13px] font-semibold leading-tight text-grafito">
            {titulo}
          </h3>
        </div>

        <div>
            <p className="cifra text-[40px] font-bold leading-none tracking-tight text-grafito md:text-[48px]">
              {numero(valorMostrado, decimales)}
              <span className="ml-1 text-base font-medium text-cota">{banda.unidad}</span>
            </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <InsigniaDelta
                delta={desviacion}
                unidad={banda.unidad}
                decimales={decimales}
                estado={estado}
              />
          </div>
        </div>

        <BandaLineaBase {...banda} sentido={sentido} decimales={decimales} />

        <PieTrazabilidad formula={formula} fuente={fuente} fechaCorte={fechaCorte} />

        {nota ? <div className="border-t border-border/60 pt-3 text-[11px]">{nota}</div> : null}
      </div>
    </article>
  );
}
