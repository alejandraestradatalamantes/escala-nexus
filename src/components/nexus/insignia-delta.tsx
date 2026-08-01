import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { numero } from "@/lib/nexus/formato";
import { TONO, type EstadoIndicador } from "@/lib/nexus/estado-indicador";

interface Props {
  delta: number;
  unidad?: string;
  decimales?: number;
  estado: EstadoIndicador;
  className?: string;
}

/** Insignia de desviación contra meta: signo, color y flecha. */
export function InsigniaDelta({ delta, unidad = "", decimales = 1, estado, className }: Props) {
  const Icono = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
  const signo = delta > 0 ? "+" : delta < 0 ? "−" : "±";
  const tono = TONO[estado];
  return (
    <span
      className={cn(
        "cifra inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        tono.fondo,
        tono.borde,
        tono.texto,
        className,
      )}
    >
      <Icono className="h-3 w-3" aria-hidden />
      {signo}
      {numero(Math.abs(delta), decimales)}
      {unidad}
    </span>
  );
}