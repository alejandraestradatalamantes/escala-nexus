import type { ReactNode } from "react";

interface Props {
  titulo: string;
  razon: ReactNode;
  formula: string;
  fuente: string;
  fechaCorte: string;
  /** Cifra parcial que sí es real (opcional). Nunca un cero falso. */
  cifra?: ReactNode;
}

/** Tarjeta para cuando falta el insumo: se dice la razón, jamás se inventa un cero. */
export function TarjetaNoCalculable({ titulo, razon, formula, fuente, fechaCorte, cifra }: Props) {
  return (
    <article className="flex flex-col gap-3 border border-border bg-card p-4">
      <h3 className="text-[13px] font-semibold uppercase tracking-wide text-cota">{titulo}</h3>
      {cifra ? (
        <p className="cifra text-[36px] leading-none text-grafito md:text-[44px]">{cifra}</p>
      ) : (
        <p className="cifra text-[28px] leading-none text-cota">No calculable</p>
      )}
      <p className="cifra border-l-2 border-casco bg-casco/10 px-2 py-1.5 text-[11px] text-grafito">
        {razon}
      </p>
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
    </article>
  );
}