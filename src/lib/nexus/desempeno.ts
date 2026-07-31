import type { Json } from "@/integrations/supabase/types";

export interface PerfilCompetencias {
  validado: boolean;
  fecha_validacion: string | null;
  validado_por: string | null;
  niveles: Record<string, number>;
}

export const PERFIL_VACIO: PerfilCompetencias = {
  validado: false,
  fecha_validacion: null,
  validado_por: null,
  niveles: {},
};

/** Lee el jsonb `puestos.perfil_competencias` sin usar `any`. */
export function leerPerfil(valor: Json | null | undefined): PerfilCompetencias {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return PERFIL_VACIO;
  const obj = valor as Record<string, Json | undefined>;
  const nivelesRaw = obj["niveles"];
  const niveles: Record<string, number> = {};
  if (nivelesRaw && typeof nivelesRaw === "object" && !Array.isArray(nivelesRaw)) {
    for (const [k, v] of Object.entries(nivelesRaw as Record<string, Json>)) {
      if (typeof v === "number") niveles[k] = v;
    }
  }
  return {
    validado: obj["validado"] === true,
    fecha_validacion: typeof obj["fecha_validacion"] === "string" ? obj["fecha_validacion"] : null,
    validado_por: typeof obj["validado_por"] === "string" ? obj["validado_por"] : null,
    niveles,
  };
}

export function perfilAJson(perfil: PerfilCompetencias): Json {
  return {
    validado: perfil.validado,
    fecha_validacion: perfil.fecha_validacion,
    validado_por: perfil.validado_por,
    niveles: perfil.niveles,
  } as unknown as Json;
}

export const AVISO_PERFIL_PROPUESTO =
  "Perfil propuesto — pendiente de validación de Dirección de Talento";

export const NIVELES = [1, 2, 3, 4, 5] as const;