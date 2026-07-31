/** Reglas compartidas del módulo Desempeño (BUILD 2B). */

/** Mínimo de personas para desplegar cualquier vista agregada sin comprometer la confidencialidad. */
export const MINIMO_AGREGADO = 5;

export const AVISO_CONFIDENCIAL =
  "Los resultados individuales de evaluación son confidenciales: solo los ven el propio colaborador, su líder directo y Dirección de Talento.";

export const AVISO_AGREGADO_INSUFICIENTE =
  "Datos insuficientes para desplegar sin comprometer la confidencialidad.";

export const EVIDENCIA_MINIMA = 80;

export const FRASE_CRITERIO =
  "Elige el nivel que observas de manera recurrente, sustentado en hechos.";

export const EJEMPLO_EVIDENCIA =
  "Ejemplo de buena evidencia: «En el cierre de mayo detectó el desfase del frente de instalaciones, reprogramó la cuadrilla y recuperó seis de los nueve días perdidos, sin costo adicional para el proyecto».";

export const AVISO_PERFIL_PENDIENTE_ENLACE =
  "El perfil del puesto sigue como propuesta: no se calcula brecha contra un perfil no validado. Valídalo en Desempeño › Perfiles por puesto.";

export interface Casilla9Box {
  casilla: number;
  desempeno: number;
  potencial: number;
  nombre: string;
  accion: string;
}

export const CASILLAS: Casilla9Box[] = [
  { casilla: 9, desempeno: 3, potencial: 3, nombre: "Sucesión inmediata", accion: "Plan de sucesión y exposición ante dirección y cliente." },
  { casilla: 8, desempeno: 2, potencial: 3, nombre: "Alto potencial", accion: "Asignación retadora en el siguiente proyecto." },
  { casilla: 7, desempeno: 1, potencial: 3, nombre: "Potencial sin resultado", accion: "Diagnóstico de causa y acompañamiento cercano del líder." },
  { casilla: 6, desempeno: 3, potencial: 2, nombre: "Alto desempeño", accion: "Ampliar alcance del frente a cargo." },
  { casilla: 5, desempeno: 2, potencial: 2, nombre: "Colaborador sólido", accion: "Sostener plan de desarrollo vigente." },
  { casilla: 4, desempeno: 1, potencial: 2, nombre: "Desempeño por debajo", accion: "Ajustar carga y revisar en 60 días." },
  { casilla: 3, desempeno: 3, potencial: 1, nombre: "Especialista de oficio", accion: "Retención por especialidad y transferencia de conocimiento." },
  { casilla: 2, desempeno: 2, potencial: 1, nombre: "Desempeño estable", accion: "Mantener en puesto con metas claras." },
  { casilla: 1, desempeno: 1, potencial: 1, nombre: "Fuera de estándar", accion: "Plan de mejora con plazo definido de 90 días." },
];

export const casillaDe = (desempeno: number, potencial: number) => (potencial - 1) * 3 + desempeno;

export const datosCasilla = (desempeno: number, potencial: number) =>
  CASILLAS.find((c) => c.desempeno === desempeno && c.potencial === potencial) ?? null;

export const ETIQUETA_TIPO_OBJETIVO: Record<string, string> = {
  negocio: "Negocio",
  proyecto: "Proyecto",
  esg: "ESG",
  talento: "Talento",
};

export const TIPOS_OBJETIVO = ["negocio", "proyecto", "esg", "talento"] as const;

export interface ObjetivoCalculo {
  peso: number | null;
  meta: number | null;
  real: number | null;
}

/** Cumplimiento = Σ (peso × min(real ÷ meta, 1)) ÷ Σ peso, en porcentaje. */
export function cumplimiento(objetivos: ObjetivoCalculo[]): number | null {
  const validos = objetivos.filter((o) => (o.peso ?? 0) > 0 && (o.meta ?? 0) > 0);
  if (validos.length === 0) return null;
  const pesos = validos.reduce((s, o) => s + (o.peso ?? 0), 0);
  const suma = validos.reduce(
    (s, o) => s + (o.peso ?? 0) * Math.min((o.real ?? 0) / (o.meta as number), 1),
    0,
  );
  return (suma / pesos) * 100;
}

export const sumaPesos = (objetivos: { peso: number | null }[]) =>
  objetivos.reduce((s, o) => s + (o.peso ?? 0), 0);

export const TIPOS_CICLO = ["180", "360", "objetivos", "calibración"] as const;

export const ETIQUETA_ESTATUS_CICLO: Record<string, string> = {
  borrador: "Borrador",
  en_curso: "En curso",
  cerrado: "Cerrado",
};

export const RIESGOS = ["bajo", "medio", "alto"] as const;
export const CRITICIDADES = ["baja", "media", "alta"] as const;