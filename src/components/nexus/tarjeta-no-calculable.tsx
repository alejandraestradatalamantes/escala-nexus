import type { ReactNode } from "react";
import { CircleDashed, type LucideIcon } from "lucide-react";
import { DetalleMetrica } from "./detalle-metrica";
import { BannerAviso } from "./banner-aviso";

interface Props {
  titulo: string;
  razon: ReactNode;
  formula: string;
  fuente: string;
  fechaCorte: string;
  /** Cifra parcial que sí es real (opcional). Nunca un cero falso. */
  cifra?: ReactNode;
  icono?: LucideIcon;
}

/** Tarjeta para cuando falta el insumo: se dice la razón, jamás se inventa un cero. */
export function TarjetaNoCalculable({
  titulo,
  razon,
  formula,
  fuente,
  fechaCorte,
  cifra,
  icono: Icono = CircleDashed,
}: Props) {
  return (
    <article className="relative overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-tarjeta)]">
      <span className="absolute inset-x-0 top-0 h-1 bg-alerta" aria-hidden />
      <div className="flex flex-col gap-4 p-5 pt-6">
        <div className="flex items-start gap-3">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-alerta-suave text-alerta"
            aria-hidden
          >
            <Icono className="h-4.5 w-4.5" />
          </span>
          <h3 className="min-w-0 flex-1 pt-1.5 text-[13px] font-semibold leading-tight text-grafito">
            {titulo}
          </h3>
          <DetalleMetrica formula={formula} fuente={fuente} fechaCorte={fechaCorte} />
        </div>
        {cifra ? (
          <p className="cifra text-[40px] font-bold leading-none tracking-tight text-grafito md:text-[48px]">
            {cifra}
          </p>
        ) : (
          <p className="cifra text-[26px] font-semibold leading-none text-cota">No calculable</p>
        )}
        <BannerAviso tono="alerta">{razon}</BannerAviso>
      </div>
    </article>
  );
}