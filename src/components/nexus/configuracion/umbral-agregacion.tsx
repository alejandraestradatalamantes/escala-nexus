import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SelectorBuscador } from "@/components/nexus/selector-buscador";
import { BannerAviso } from "@/components/nexus/banner-aviso";
import { useUmbralAgregacion } from "@/hooks/use-umbral";
import { UMBRAL_MAXIMO, UMBRAL_MINIMO } from "@/lib/nexus/bienestar";
import { fechaCorta } from "@/lib/nexus/formato";

interface Props {
  puedeEditar: boolean;
  usuarioId: string | null;
}

const OPCIONES = Array.from({ length: UMBRAL_MAXIMO - UMBRAL_MINIMO + 1 }, (_, i) => {
  const v = UMBRAL_MINIMO + i;
  return { valor: String(v), etiqueta: `${v} respondientes` };
});

/**
 * Umbral mínimo de agregación de Bienestar. Vive aquí, no en el código:
 * las funciones de base lo leen de este catálogo.
 */
export function UmbralAgregacion({ puedeEditar, usuarioId }: Props) {
  const qc = useQueryClient();
  const { umbral, parametro, cargando } = useUmbralAgregacion();
  const [borrador, setBorrador] = useState(String(umbral));

  useEffect(() => {
    setBorrador(String(umbral));
  }, [umbral]);

  const guardar = useMutation({
    mutationFn: async () => {
      const nuevo = Number(borrador);
      if (!Number.isInteger(nuevo) || nuevo < UMBRAL_MINIMO || nuevo > UMBRAL_MAXIMO)
        throw new Error(
          `El umbral debe estar entre ${UMBRAL_MINIMO} y ${UMBRAL_MAXIMO}: con menos de ${UMBRAL_MINIMO} el resultado es la respuesta individual.`,
        );
      const { error } = await supabase
        .from("parametros_bienestar")
        .update({ umbral_agregacion: nuevo, actualizado_por: usuarioId })
        .eq("id", 1);
      if (error) throw error;
      await supabase.from("bitacora_auditoria").insert({
        usuario_id: usuarioId,
        accion: "Cambió el umbral de agregación de Bienestar",
        tabla: "parametros_bienestar",
        antes: { umbral_agregacion: umbral } as never,
        despues: { umbral_agregacion: nuevo } as never,
      });
    },
    onSuccess: () => {
      toast.success("Umbral actualizado y registrado en la bitácora.");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const elegido = Number(borrador);
  const bajo = elegido < 5;

  return (
    <section className="border border-border bg-card p-4">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-cota">
        Umbral de agregación de Bienestar
      </h2>
      <p className="mt-1 max-w-3xl text-[13px] text-cota">
        Número mínimo de respondientes para desplegar cualquier corte de clima, ánimo o comentarios.
        Las funciones de base leen este valor: cambiarlo aquí cambia de inmediato qué cortes se
        suprimen, sin tocar código.
      </p>

      {cargando ? (
        <Skeleton className="mt-3 h-10 w-64 rounded-none" />
      ) : (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="w-full max-w-64">
            <SelectorBuscador
              ariaLabel="Umbral de agregación"
              valor={borrador}
              onCambio={setBorrador}
              opciones={OPCIONES}
            />
          </div>
          {puedeEditar ? (
            <Button
              className="h-10 rounded-none text-[12px]"
              disabled={guardar.isPending || elegido === umbral}
              onClick={() => guardar.mutate()}
            >
              Guardar umbral
            </Button>
          ) : (
            <p className="text-[12px] text-cota">
              Solo Dirección de Talento y Dirección General pueden cambiarlo.
            </p>
          )}
        </div>
      )}

      {bajo ? (
        <BannerAviso
          tono="riesgo"
          titulo="Un umbral por debajo de 5 debilita el anonimato efectivo"
          className="mt-3 max-w-3xl"
        >
          Con grupos de 3 o 4 personas, aunque el sistema nunca revele nombres, la aritmética puede
          exponer a quien respondió distinto al resto: basta comparar el promedio con lo que cada
          quien sabe de su propio grupo. Eso desincentiva la respuesta honesta y compromete la
          confiabilidad del instrumento. El estándar habitual en encuestas de clima es 5. El umbral
          aplicable a las evaluaciones de NOM-035 debe confirmarse con Jurídico antes de sostener
          este valor.
        </BannerAviso>
      ) : null}

      <p className="mt-3 border-t border-border pt-2 text-[11px] text-cota">
        Valor vigente: {umbral} respondientes
        {parametro?.updated_at ? ` · actualizado el ${fechaCorta(parametro.updated_at)}` : ""}. No
        se aceptan valores de 1 ni 2 por ninguna vía. Cada cambio queda en la bitácora de auditoría.
      </p>
    </section>
  );
}
