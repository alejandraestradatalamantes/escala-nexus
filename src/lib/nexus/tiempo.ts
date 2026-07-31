/** Reglas compartidas del módulo Tiempo (BUILD 4). */

const DIA = 86_400_000;

export interface TipoSolicitud {
  clave: string;
  etiqueta: string;
  /** Descuenta del saldo de vacaciones. */
  consumeSaldo: boolean;
  /** Cuenta como ausentismo (incapacidad y falta). */
  ausentismo: boolean;
}

export const TIPOS: TipoSolicitud[] = [
  { clave: "vacaciones", etiqueta: "Vacaciones", consumeSaldo: true, ausentismo: false },
  { clave: "permiso_goce", etiqueta: "Permiso con goce", consumeSaldo: false, ausentismo: false },
  {
    clave: "permiso_sin_goce",
    etiqueta: "Permiso sin goce",
    consumeSaldo: false,
    ausentismo: false,
  },
  { clave: "incapacidad", etiqueta: "Incapacidad", consumeSaldo: false, ausentismo: true },
  { clave: "paternidad", etiqueta: "Paternidad", consumeSaldo: false, ausentismo: false },
  { clave: "maternidad", etiqueta: "Maternidad", consumeSaldo: false, ausentismo: false },
  { clave: "defuncion", etiqueta: "Defunción", consumeSaldo: false, ausentismo: false },
  { clave: "falta", etiqueta: "Falta", consumeSaldo: false, ausentismo: true },
];

export const ETIQUETA_TIPO: Record<string, string> = Object.fromEntries(
  TIPOS.map((t) => [t.clave, t.etiqueta]),
);

export const ETIQUETA_ESTATUS: Record<string, string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  cancelada: "Cancelada",
};

export const CLASE_ESTATUS: Record<string, string> = {
  pendiente: "bg-casco/15 text-grafito",
  aprobada: "bg-linea/15 text-linea",
  rechazada: "bg-desviacion/15 text-desviacion",
  cancelada: "bg-cota/15 text-cota",
};

export const esAusentismo = (tipo: string) =>
  TIPOS.find((t) => t.clave === tipo)?.ausentismo ?? false;

export const consumeSaldo = (tipo: string) =>
  TIPOS.find((t) => t.clave === tipo)?.consumeSaldo ?? false;

/** Fecha local en formato ISO corto, sin desfase por zona horaria. */
export function iso(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Convierte 'YYYY-MM-DD' a Date local a mediodía: inmune a cambios de huso. */
export function fecha(valor: string): Date {
  const [y, m, d] = valor.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

const esHabil = (d: Date) => d.getDay() !== 0 && d.getDay() !== 6;

/** Días hábiles (lunes a viernes) entre dos fechas, ambas incluidas. No considera días festivos oficiales. */
export function diasHabiles(inicio?: string | null, fin?: string | null): number {
  if (!inicio || !fin) return 0;
  const a = fecha(inicio);
  const b = fecha(fin);
  if (b < a) return 0;
  let total = 0;
  for (let cursor = new Date(a); cursor <= b; cursor.setDate(cursor.getDate() + 1)) {
    if (esHabil(cursor)) total += 1;
  }
  return total;
}

/** Días hábiles transcurridos desde una marca de tiempo hasta la fecha de corte. */
export function diasHabilesDesde(desde?: string | null, hasta: Date = new Date()): number {
  if (!desde) return 0;
  const a = new Date(desde);
  a.setHours(12, 0, 0, 0);
  const b = new Date(hasta);
  b.setHours(12, 0, 0, 0);
  if (b <= a) return 0;
  let total = 0;
  const cursor = new Date(a);
  cursor.setDate(cursor.getDate() + 1);
  for (; cursor <= b; cursor.setDate(cursor.getDate() + 1)) {
    if (esHabil(cursor)) total += 1;
  }
  return total;
}

/** Días hábiles del periodo, para el denominador del ausentismo. */
export function diasHabilesDelPeriodo(inicio: Date, fin: Date): number {
  return diasHabiles(iso(inicio), iso(fin));
}

export interface TramoLft {
  anios_min: number;
  anios_max: number | null;
  dias_ley: number;
}

/** Años de servicio cumplidos a la fecha de corte. */
export function aniosDeServicio(ingreso?: string | null, corte: Date = new Date()): number | null {
  if (!ingreso) return null;
  return Math.max(0, Math.floor((corte.getTime() - fecha(ingreso).getTime()) / (DIA * 365.25)));
}

/** Aniversario laboral siguiente: es la fecha que mueve el saldo. */
export function proximoAniversario(ingreso?: string | null, corte: Date = new Date()): Date | null {
  if (!ingreso) return null;
  const base = fecha(ingreso);
  const aniversario = new Date(corte.getFullYear(), base.getMonth(), base.getDate(), 12);
  if (aniversario < corte) aniversario.setFullYear(aniversario.getFullYear() + 1);
  return aniversario;
}

/**
 * Días de ley según el catálogo del artículo 76 (Configuración › Vacaciones).
 * Nunca se codifica la tabla aquí: si el catálogo está vacío, no hay cálculo.
 */
export function diasLeyDeCatalogo(catalogo: TramoLft[], anios: number | null): number | null {
  if (anios === null || catalogo.length === 0) return null;
  if (anios === 0) {
    const primero = catalogo.find((t) => t.anios_min === 1) ?? catalogo[0];
    return primero ? primero.dias_ley : null;
  }
  const tramo = catalogo.find(
    (t) => anios >= t.anios_min && (t.anios_max === null || anios <= t.anios_max),
  );
  return tramo ? tramo.dias_ley : null;
}

/** Prima vacacional: porcentaje mínimo del artículo 80 sobre los días de vacaciones. */
export function primaVacacional(dias: number | null, pct: number | null): number | null {
  if (dias === null || pct === null) return null;
  return (dias * pct) / 100;
}

export interface RangoAusencia {
  fecha_inicio: string | null;
  fecha_fin: string | null;
}

/** Dos rangos de fechas se cruzan (ambos extremos inclusive). */
export function seTraslapan(a: RangoAusencia, b: RangoAusencia): boolean {
  if (!a.fecha_inicio || !a.fecha_fin || !b.fecha_inicio || !b.fecha_fin) return false;
  return a.fecha_inicio <= b.fecha_fin && b.fecha_inicio <= a.fecha_fin;
}

/** Una ausencia cubre la fecha dada. */
export function cubre(rango: RangoAusencia, dia: string): boolean {
  if (!rango.fecha_inicio || !rango.fecha_fin) return false;
  return rango.fecha_inicio <= dia && dia <= rango.fecha_fin;
}

export const UMBRAL_POR_OMISION = 3;

/** Semáforo de espera de una solicitud pendiente contra el umbral del catálogo. */
export function colorEspera(diasEsperando: number, umbral: number): string {
  if (diasEsperando > umbral) return "text-desviacion";
  if (diasEsperando >= umbral) return "text-casco";
  return "text-linea";
}

export const HORAS_JORNADA = 8;
