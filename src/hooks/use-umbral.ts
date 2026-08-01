import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UMBRAL_RESPALDO } from "@/lib/nexus/bienestar";

export interface ParametroUmbral {
  umbral_agregacion: number;
  updated_at: string | null;
  actualizado_por: string | null;
}

/**
 * Umbral de agregación vigente. Vive en Configuración; la constante de respaldo
 * solo entra si el catálogo no responde.
 */
export function useUmbralAgregacion() {
  const consulta = useQuery({
    queryKey: ["umbral-agregacion"],
    staleTime: 60_000,
    queryFn: async (): Promise<ParametroUmbral | null> => {
      const { data } = await supabase
        .from("parametros_bienestar")
        .select("umbral_agregacion, updated_at, actualizado_por")
        .eq("id", 1)
        .maybeSingle();
      return data ?? null;
    },
  });
  return {
    umbral: consulta.data?.umbral_agregacion ?? UMBRAL_RESPALDO,
    parametro: consulta.data ?? null,
    cargando: consulta.isLoading,
  };
}
