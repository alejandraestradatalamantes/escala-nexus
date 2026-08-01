export type EstadoIndicador = "exito" | "alerta" | "riesgo" | "neutro";

/**
 * Estado visual de un indicador contra su meta. No cambia el cálculo: solo
 * traduce el cumplimiento a un color con significado.
 */
export function estadoDe(
  valor: number,
  meta: number,
  sentido: "mayorEsMejor" | "menorEsMejor" = "mayorEsMejor",
  rango = Math.abs(meta) || 1,
): EstadoIndicador {
  if (!Number.isFinite(valor) || !Number.isFinite(meta)) return "neutro";
  const cumple = sentido === "mayorEsMejor" ? valor >= meta : valor <= meta;
  if (cumple) return "exito";
  const brecha = Math.abs(valor - meta) / (Math.abs(rango) || 1);
  return brecha <= 0.1 ? "alerta" : "riesgo";
}

interface Tono {
  texto: string;
  fondo: string;
  borde: string;
  barra: string;
  trazo: string;
  acento: string;
}

export const TONO: Record<EstadoIndicador, Tono> = {
  exito: {
    texto: "text-exito",
    fondo: "bg-exito-suave",
    borde: "border-exito/30",
    barra: "bg-exito",
    trazo: "var(--color-exito)",
    acento: "bg-exito",
  },
  alerta: {
    texto: "text-alerta",
    fondo: "bg-alerta-suave",
    borde: "border-alerta/35",
    barra: "bg-alerta",
    trazo: "var(--color-alerta)",
    acento: "bg-alerta",
  },
  riesgo: {
    texto: "text-riesgo",
    fondo: "bg-riesgo-suave",
    borde: "border-riesgo/30",
    barra: "bg-riesgo",
    trazo: "var(--color-riesgo)",
    acento: "bg-riesgo",
  },
  neutro: {
    texto: "text-cota",
    fondo: "bg-muted",
    borde: "border-border",
    barra: "bg-cota",
    trazo: "var(--color-cota)",
    acento: "bg-cota",
  },
};