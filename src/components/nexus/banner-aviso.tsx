import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, EyeOff, Info, Lock, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type Tono = "info" | "alerta" | "riesgo" | "exito" | "confidencial";

const ESTILOS: Record<Tono, { caja: string; icono: string; Icono: typeof Info }> = {
  info: { caja: "border-info/25 bg-info-suave", icono: "text-info", Icono: Info },
  alerta: { caja: "border-alerta/35 bg-alerta-suave", icono: "text-alerta", Icono: AlertTriangle },
  riesgo: { caja: "border-riesgo/30 bg-riesgo-suave", icono: "text-riesgo", Icono: ShieldAlert },
  exito: { caja: "border-exito/30 bg-exito-suave", icono: "text-exito", Icono: CheckCircle2 },
  confidencial: { caja: "border-info/20 bg-info-suave/60", icono: "text-info", Icono: Lock },
};

interface Props {
  tono?: Tono;
  titulo?: string;
  children: ReactNode;
  ojoTachado?: boolean;
  className?: string;
}

/** Aviso con ícono y color. Nunca texto rojo suelto. */
export function BannerAviso({ tono = "info", titulo, children, ojoTachado, className }: Props) {
  const e = ESTILOS[tono];
  const Icono = ojoTachado ? EyeOff : e.Icono;
  return (
    <div
      role="note"
      className={cn("flex gap-3 rounded-xl border p-3 text-[12px]", e.caja, className)}
    >
      <Icono className={cn("mt-0.5 h-4 w-4 shrink-0", e.icono)} aria-hidden />
      <div className="min-w-0 space-y-0.5">
        {titulo ? <p className="font-semibold text-grafito">{titulo}</p> : null}
        <div className="text-grafito/85">{children}</div>
      </div>
    </div>
  );
}