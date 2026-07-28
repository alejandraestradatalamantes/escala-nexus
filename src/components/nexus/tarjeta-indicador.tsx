import type { ReactNode } from "react";
import { BandaLineaBase, type BandaLineaBaseProps } from "./banda-linea-base";
import { numero } from "@/lib/nexus/formato";

interface Props extends BandaLineaBaseProps {
  titulo: string;
  formula: string;
  fuente: string;
  fechaCorte: string;
  nota?: ReactNode;
}

/** Ningún indicador aparece sin fórmula visible, fuente y fecha de corte. */
export function TarjetaIndicador({ titulo, formula, fuente, fechaCorte, nota, ...banda }: Props) {
  return (
    <article className="flex flex-col gap-3 border border-border bg-card p-4">
      <h3 className="text-[13px] font-semibold uppercase tracking-wide text-cota">{titulo}</h3>
      <p className="cifra text-3xl leading-none text-grafito">
        {numero(banda.valor, banda.decimales ?? 1)}
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