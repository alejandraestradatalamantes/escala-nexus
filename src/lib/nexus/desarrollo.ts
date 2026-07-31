/** Reglas compartidas del módulo Desarrollo (BUILD 3). */

export const CICLO_ACTUAL = "2026";

export const MAX_PRIORIDADES = 3;

export interface Via {
  clave: string;
  etiqueta: string;
  pct: number;
  ayuda: string;
  tipos: string[];
}

/** 70-20-10: la experiencia manda, la formación acompaña. */
export const VIAS: Via[] = [
  {
    clave: "experiencia",
    etiqueta: "Experiencia",
    pct: 70,
    ayuda: "Lo que se aprende haciendo: un frente nuevo, una asignación retadora, delegación real.",
    tipos: [
      "asignación retadora",
      "delegación",
      "proyecto especial",
      "rotación",
      "exposición",
      "suplencia",
    ],
  },
  {
    clave: "otros",
    etiqueta: "Aprendizaje de otros",
    pct: 20,
    ayuda: "Lo que se aprende con alguien: mentoría, sombra, acompañamiento, retroalimentación.",
    tipos: ["mentoría", "sombra", "acompañamiento", "coaching", "retroalimentación estructurada"],
  },
  {
    clave: "formacion",
    etiqueta: "Formación",
    pct: 10,
    ayuda: "Lo que se aprende en el aula: curso, taller, diplomado, certificación.",
    tipos: ["curso", "taller", "diplomado", "certificación", "lectura guiada"],
  },
];

export const ETIQUETA_VIA: Record<string, string> = Object.fromEntries(
  VIAS.map((v) => [v.clave, v.etiqueta]),
);

export const ESTATUS_ACCION = ["planeada", "en_curso", "concluida", "cancelada"] as const;

export const ETIQUETA_ESTATUS_ACCION: Record<string, string> = {
  planeada: "Planeada",
  en_curso: "En curso",
  concluida: "Concluida",
  cancelada: "Cancelada",
};

export const ETIQUETA_ESTATUS_AGENDA: Record<string, string> = {
  borrador: "Borrador",
  revision: "En revisión",
  autorizada: "Autorizada",
};

export const DIMENSIONES = ["Estrategia", "Gestión", "Personas", "Técnica"] as const;

export const TIPOS_SESION = ["apertura", "seguimiento", "cierre"] as const;

export const AVISO_AUTORREFLEXION =
  "La autorreflexión es de lectura restringida: solo la ven el propio colaborador, su líder directo y Dirección de Talento.";

export const AVISO_AUTORIZACION =
  "Una agenda sin acciones concretas y sin forma de medirlas no se autoriza. Es una lista de buenas intenciones, no un plan.";

/** Avance = acciones concluidas ÷ acciones vigentes (las canceladas no cuentan) × 100. */
export function avanceAgenda(acciones: { estatus: string }[]): number | null {
  const vigentes = acciones.filter((a) => a.estatus !== "cancelada");
  if (vigentes.length === 0) return null;
  return (vigentes.filter((a) => a.estatus === "concluida").length / vigentes.length) * 100;
}

/** Reparto real de acciones entre las tres vías, en porcentaje. */
export function mezclaAprendizaje(acciones: { via_aprendizaje: string | null }[]) {
  const total = acciones.length;
  return VIAS.map((v) => {
    const n = acciones.filter((a) => a.via_aprendizaje === v.clave).length;
    return { ...v, n, real: total === 0 ? 0 : (n / total) * 100 };
  });
}

export type Semaforo = "vencida" | "por_vencer" | "vigente" | "sin_fecha";

export const ETIQUETA_SEMAFORO: Record<Semaforo, string> = {
  vencida: "Vencida",
  por_vencer: "Por vencer",
  vigente: "Vigente",
  sin_fecha: "Sin fecha",
};

export const DIAS_AVISO_VENCIMIENTO = 90;

export function semaforoCertificacion(vencimiento: string | null, hoy = new Date()): Semaforo {
  if (!vencimiento) return "sin_fecha";
  const fin = new Date(`${vencimiento}T00:00:00`);
  const dias = Math.floor((fin.getTime() - hoy.getTime()) / 86_400_000);
  if (dias < 0) return "vencida";
  if (dias <= DIAS_AVISO_VENCIMIENTO) return "por_vencer";
  return "vigente";
}

export const CLASE_SEMAFORO: Record<Semaforo, string> = {
  vencida: "border-desviacion text-desviacion",
  por_vencer: "border-casco text-casco",
  vigente: "border-linea text-linea",
  sin_fecha: "border-border text-cota",
};

/** Motivos por los que una agenda todavía no se puede autorizar. */
export function bloqueosAutorizacion(
  prioridades: { id: string; descripcion: string | null }[],
  acciones: { prioridad_id: string; medicion_exito: string | null }[],
): string[] {
  const motivos: string[] = [];
  if (prioridades.length === 0) motivos.push("La agenda no tiene ninguna prioridad de desarrollo.");
  for (const p of prioridades) {
    const suyas = acciones.filter((a) => a.prioridad_id === p.id);
    const rotulo = p.descripcion?.slice(0, 48) ?? "Prioridad sin descripción";
    if (suyas.length === 0) {
      motivos.push(`«${rotulo}» no tiene acciones registradas.`);
      continue;
    }
    if (suyas.some((a) => !a.medicion_exito || a.medicion_exito.trim() === "")) {
      motivos.push(`«${rotulo}» tiene acciones sin medición de éxito.`);
    }
  }
  return motivos;
}