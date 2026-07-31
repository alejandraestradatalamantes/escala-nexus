import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { haceDias, iso } from "@/lib/nexus/bienestar";

export interface EncuestaResumen {
  id: string;
  nombre: string;
  tipo: string | null;
  estatus: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  cobertura_objetivo: number | null;
  cerrada_en: string | null;
  avance: number;
}

/** Encuestas con su avance de cobertura (cuántas van, nunca quiénes) y la plantilla activa. */
export function useEncuestas() {
  return useQuery({
    queryKey: ["bienestar-encuestas"],
    queryFn: async () => {
      const [enc, cols] = await Promise.all([
        supabase
          .from("encuestas")
          .select("id, nombre, tipo, estatus, fecha_inicio, fecha_fin, cobertura_objetivo, cerrada_en")
          .order("fecha_inicio", { ascending: false }),
        supabase.from("colaboradores").select("id").eq("estatus", "activo"),
      ]);
      const filas = enc.data ?? [];
      const avances = await Promise.all(
        filas.map((e) => supabase.rpc("encuesta_avance", { _encuesta: e.id })),
      );
      const encuestas: EncuestaResumen[] = filas.map((e, i) => ({
        ...e,
        avance: Number(avances[i]?.data ?? 0),
      }));
      return { encuestas, plantilla: cols.data?.length ?? 0 };
    },
  });
}

export function useSupuestosBienestar() {
  return useQuery({
    queryKey: ["bienestar-supuestos"],
    queryFn: async () => {
      const { data } = await supabase.from("supuestos_financieros").select("clave, valor");
      const de = (clave: string) => data?.find((s) => s.clave === clave)?.valor ?? null;
      return {
        enpsMeta: de("enps_meta"),
        enpsLineaBase: de("enps_linea_base"),
        animoMeta: de("animo_meta"),
        participacionMeta: de("participacion_reconocimientos_meta"),
      };
    },
  });
}

export const PERIODO_ANIMO_DIAS = 30;
export const PERIODO_RECONOCIMIENTOS_DIAS = 90;

export function useAnimoFirma(activo: boolean) {
  const desde = iso(haceDias(PERIODO_ANIMO_DIAS));
  const hasta = iso(new Date());
  return useQuery({
    queryKey: ["animo-firma", desde, hasta],
    enabled: activo,
    queryFn: async () => {
      const { data } = await supabase.rpc("animo_firma", { _desde: desde, _hasta: hasta });
      return data?.[0] ?? null;
    },
  });
}

export function useParticipacionReconocimientos() {
  const desde = iso(haceDias(PERIODO_RECONOCIMIENTOS_DIAS));
  const hasta = iso(new Date());
  return useQuery({
    queryKey: ["participacion-reconocimientos", desde, hasta],
    queryFn: async () => {
      const { data } = await supabase.rpc("participacion_reconocimientos", {
        _desde: desde,
        _hasta: hasta,
      });
      return data?.[0] ?? null;
    },
  });
}