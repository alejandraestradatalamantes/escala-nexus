import { MINIMO_AGREGADO } from "./evaluacion";

/** Ninguna vista agregada de Bienestar se despliega con menos de cinco personas. */
export const MINIMO_AGREGACION = MINIMO_AGREGADO;

export const AVISO_ANONIMATO =
  "Las respuestas de encuesta se guardan con un identificador irreversible, no con tu nombre. Nadie —ni Dirección de Talento, ni Dirección General, ni Sistemas— puede leerlas persona por persona: solo se consultan agregadas y con un mínimo de cinco respondientes por corte.";

export const AVISO_PULSO =
  "Tu pulso y tu comentario son tuyos. Tu líder no los ve: solo el promedio de su equipo, y únicamente si el equipo llega a cinco personas con registro.";

export const AVISO_COMENTARIOS_TALENTO =
  "Comentarios desligados de la persona y en orden aleatorio. Se muestran solo cuando hay al menos cinco comentarios distintos en el periodo.";

export const AVISO_SUPRIMIDO =
  "Corte suprimido: menos de cinco respondientes. Desplegarlo comprometería el anonimato.";

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