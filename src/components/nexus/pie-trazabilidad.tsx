interface Props {
  formula: string;
  fuente: string;
  fechaCorte: string;
}

/**
 * Trazabilidad visible: fórmula, fuente y fecha de corte impresas en la tarjeta.
 * Es la premisa del producto — ningún indicador se muestra sin ellas.
 */
export function PieTrazabilidad({ formula, fuente, fechaCorte }: Props) {
  return (
    <dl className="space-y-1.5 border-t border-border/60 pt-3 text-[11px] leading-snug">
      <div className="flex gap-2">
        <dt className="w-14 shrink-0 font-semibold uppercase tracking-wide text-cota">Fórmula</dt>
        <dd className="min-w-0 flex-1 text-grafito">{formula}</dd>
      </div>
      <div className="flex gap-2">
        <dt className="w-14 shrink-0 font-semibold uppercase tracking-wide text-cota">Fuente</dt>
        <dd className="min-w-0 flex-1 text-grafito">{fuente}</dd>
      </div>
      <div className="flex gap-2">
        <dt className="w-14 shrink-0 font-semibold uppercase tracking-wide text-cota">Corte</dt>
        <dd className="cifra min-w-0 flex-1 text-grafito">{fechaCorte}</dd>
      </div>
    </dl>
  );
}
