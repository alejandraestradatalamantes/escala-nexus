/**
 * El umbral de agregación vive en Configuración (tabla `parametros_bienestar`).
 * Esta constante es únicamente el respaldo si el catálogo no responde: nunca la fuente de verdad.
 */
export const UMBRAL_RESPALDO = 5;

/** Rango permitido del umbral. Con menos de 3 el resultado es la respuesta individual. */
export const UMBRAL_MINIMO = 3;
export const UMBRAL_MAXIMO = 10;

export const avisoAnonimato = (umbral: number) =>
  `Las respuestas de encuesta se guardan con un identificador irreversible, no con tu nombre. Nadie —ni Dirección de Talento, ni Dirección General, ni Sistemas— puede leerlas persona por persona: solo se consultan agregadas y con un mínimo de ${umbral} respondientes por corte.`;

export const avisoPulso = (umbral: number) =>
  `Tu pulso y tu comentario son tuyos. Tu líder no los ve: solo el promedio de su equipo, y únicamente si el equipo llega a ${umbral} personas con registro.`;

export const avisoComentariosTalento = (umbral: number) =>
  `Comentarios desligados de la persona y en orden aleatorio. Se muestran solo cuando hay al menos ${umbral} comentarios distintos en el periodo.`;

export const avisoSuprimido = (umbral: number) =>
  `Corte suprimido: menos de ${umbral} respondientes. Desplegarlo comprometería el anonimato.`;

/** Leyenda de trazabilidad para imprimir junto a cualquier resultado agregado. */
export const leyendaUmbral = (umbral: number) =>
  `Cortes suprimidos por debajo de ${umbral} respondientes (umbral vigente en Configuración).`;

export interface Reactivo {
  clave: string;
  texto: string;
  dimension: string;
  escala: "enps" | "acuerdo";
}

/** Cuestionario del clima. El reactivo `enps` es la pregunta de recomendación. */
export const REACTIVOS: Reactivo[] = [
  {
    clave: "enps",
    texto:
      "¿Qué tan probable es que recomiendes a Escala como un buen lugar para trabajar a alguien de tu oficio?",
    dimension: "Recomendación",
    escala: "enps",
  },
  {
    clave: "confianza",
    texto: "La dirección cumple lo que promete y explica las decisiones que nos afectan.",
    dimension: "Credibilidad",
    escala: "acuerdo",
  },
  {
    clave: "imparcialidad",
    texto: "Las oportunidades, los ascensos y los reconocimientos se reparten con justicia.",
    dimension: "Imparcialidad",
    escala: "acuerdo",
  },
  {
    clave: "orgullo",
    texto: "Me siento orgulloso de la obra que entregamos y de cómo la entregamos.",
    dimension: "Orgullo",
    escala: "acuerdo",
  },
  {
    clave: "camaraderia",
    texto: "Puedo contar con mi equipo cuando el trabajo se pone difícil.",
    dimension: "Camaradería",
    escala: "acuerdo",
  },
  {
    clave: "seguridad_psicologica",
    texto: "Puedo señalar un riesgo o admitir un error sin temor a represalia.",
    dimension: "Respeto",
    escala: "acuerdo",
  },
];

export const reactivoDe = (clave: string) => REACTIVOS.find((r) => r.clave === clave) ?? null;

export const ETIQUETA_ACUERDO: Record<number, string> = {
  1: "Nada de acuerdo",
  2: "Poco de acuerdo",
  3: "Ni de acuerdo ni en desacuerdo",
  4: "De acuerdo",
  5: "Totalmente de acuerdo",
};

export interface OpcionAnimo {
  valor: number;
  etiqueta: string;
}

export const ESCALA_ANIMO: OpcionAnimo[] = [
  { valor: 1, etiqueta: "Muy mal" },
  { valor: 2, etiqueta: "Mal" },
  { valor: 3, etiqueta: "Ni bien ni mal" },
  { valor: 4, etiqueta: "Bien" },
  { valor: 5, etiqueta: "Muy bien" },
];

export const etiquetaAnimo = (valor: number) =>
  ESCALA_ANIMO.find((o) => o.valor === valor)?.etiqueta ?? "—";

export const CORTES = [
  { valor: "firma", etiqueta: "Firma completa" },
  { valor: "ubicacion", etiqueta: "Ubicación" },
  { valor: "area", etiqueta: "Área" },
  { valor: "grupo", etiqueta: "Grupo de reporte" },
] as const;

export type Corte = (typeof CORTES)[number]["valor"];

export const iso = (d: Date) => d.toISOString().slice(0, 10);

export function haceDias(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d;
}

/** eNPS = % promotores (9–10) − % detractores (0–6). */
export function enpsDe(valores: number[]): number | null {
  if (valores.length === 0) return null;
  const promotores = valores.filter((v) => v >= 9).length;
  const detractores = valores.filter((v) => v <= 6).length;
  return ((promotores - detractores) / valores.length) * 100;
}