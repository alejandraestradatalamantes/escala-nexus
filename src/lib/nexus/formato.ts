import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

export const fechaCorta = (v?: string | Date | null) =>
  v ? format(new Date(v), "dd MMM yyyy", { locale: es }) : "—";

export const fechaLarga = (v?: string | Date | null) =>
  v ? format(new Date(v), "d 'de' MMMM 'de' yyyy", { locale: es }) : "—";

export const numero = (v: number | null | undefined, decimales = 1) =>
  v === null || v === undefined || Number.isNaN(v)
    ? "—"
    : v.toLocaleString("es-MX", {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales,
      });

export const antiguedadAnios = (ingreso?: string | null) =>
  ingreso ? differenceInDays(new Date(), new Date(ingreso)) / 365.25 : 0;

export const iniciales = (nombre: string) =>
  nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

export const ETIQUETA_ROL: Record<string, string> = {
  direccion_talento: "Dirección de Talento",
  direccion_general: "Dirección General",
  lider_proyecto: "Líder de Proyecto",
  reclutamiento: "Reclutamiento",
  colaborador: "Colaborador",
  finanzas_auditoria: "Finanzas y Auditoría",
  ti_sistema: "TI / Sistema",
};

export const ROLES = Object.keys(ETIQUETA_ROL);