/** Reglas de negocio del módulo de Atracción. */

const DIA = 86_400_000;

/** Días transcurridos entre dos fechas (la segunda por omisión es hoy). */
export function diasDesde(desde?: string | null, hasta?: string | null): number | null {
  if (!desde) return null;
  const fin = hasta ? new Date(hasta) : new Date();
  return Math.max(0, Math.round((fin.getTime() - new Date(desde).getTime()) / DIA));
}

/** Días abierta = (fecha de cierre real o hoy) − fecha de apertura. */
export function diasAbierta(vacante: {
  fecha_apertura: string | null;
  fecha_cierre_real: string | null;
}): number | null {
  return diasDesde(vacante.fecha_apertura, vacante.fecha_cierre_real);
}

/** Semáforo contra la fecha meta de cobertura. */
export function colorDiasAbierta(
  dias: number | null,
  apertura: string | null,
  meta: string | null,
): string {
  if (dias === null || !apertura || !meta) return "text-grafito";
  const objetivo = diasDesde(apertura, meta) ?? 0;
  const desviacion = dias - objetivo;
  if (desviacion <= 0) return "text-linea";
  if (desviacion <= 10) return "text-casco";
  return "text-desviacion";
}

/** Semáforo del candidato contra el SLA de su fase. */
export function colorSla(diasEnFase: number | null, sla: number | null): string {
  if (diasEnFase === null || sla === null) return "border-l-cota/40";
  const desviacion = diasEnFase - sla;
  if (desviacion <= 0) return "border-l-linea";
  if (desviacion <= 3) return "border-l-casco";
  return "border-l-desviacion";
}

export const FUENTES = [
  "Referido interno",
  "OCC",
  "LinkedIn",
  "Bolsa universitaria",
  "Base propia",
] as const;

export const MOTIVOS_DESCARTE = [
  "No cumple perfil técnico",
  "Expectativa salarial",
  "Declinó el proceso",
  "Se contrató a otro candidato",
  "Otro",
] as const;

export const pesos = (v: number) =>
  v.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });