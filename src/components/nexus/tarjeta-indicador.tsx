import { useEffect, useRef, useState, type ReactNode } from "react";
import { BandaLineaBase, type BandaLineaBaseProps } from "./banda-linea-base";
import { numero } from "@/lib/nexus/formato";

interface Props extends BandaLineaBaseProps {
  titulo: string;
  formula: string;
  fuente: string;
  fechaCorte: string;
  nota?: ReactNode;
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

/** Ningún indicador aparece sin fórmula visible, fuente y fecha de corte. */
export function TarjetaIndicador({ titulo, formula, fuente, fechaCorte, nota, ...banda }: Props) {
  const valorMostrado = useConteo(banda.valor);

  return (
    <article className="flex flex-col gap-3 border border-border bg-card p-4">
      <h3 className="text-[13px] font-semibold uppercase tracking-wide text-cota">{titulo}</h3>
      <p className="cifra text-[36px] leading-none text-grafito md:text-[44px]">
        {numero(valorMostrado, banda.decimales ?? 1)}
        <span className="ml-1 text-base text-cota">{banda.unidad}</span>
      </p>
      <BandaLineaBase {...banda} />
      <dl className="mt-1 space-y-1 border-t border-border pt-2 text-[11px] text-cota">
        <div className="flex gap-2">
          <dt className="shrink-0 font-semibold">Fórmula</dt>
          <dd className="min-w-0">{formula}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 font-semibold">Fuente</dt>
          <dd className="min-w-0">{fuente}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 font-semibold">Corte</dt>
          <dd className="cifra min-w-0">{fechaCorte}</dd>
        </div>
      </dl>
      {nota}
    </article>
  );
}
