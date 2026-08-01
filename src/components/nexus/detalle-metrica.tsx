import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Props {
  formula: string;
  fuente: string;
  fechaCorte: string;
}

/**
 * Trazabilidad de cada cifra: fórmula, fuente y fecha de corte.
 * Sigue disponible siempre, ahora tras un ícono de información.
 */
export function DetalleMetrica({ formula, fuente, fechaCorte }: Props) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label="Ver fórmula, fuente y fecha de corte"
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-cota transition-colors hover:bg-muted hover:text-grafito"
      >
        <Info className="h-4 w-4" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-xl text-[12px]">
        <dl className="space-y-2.5">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-cota">Fórmula</dt>
            <dd className="mt-0.5 text-grafito">{formula}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-cota">Fuente</dt>
            <dd className="mt-0.5 text-grafito">{fuente}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-cota">
              Fecha de corte
            </dt>
            <dd className="cifra mt-0.5 text-grafito">{fechaCorte}</dd>
          </div>
        </dl>
      </PopoverContent>
    </Popover>
  );
}