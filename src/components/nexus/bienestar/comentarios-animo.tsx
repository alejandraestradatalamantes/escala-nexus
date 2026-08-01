import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EsqueletoTabla } from "@/components/nexus/esqueletos";
import { avisoComentariosTalento, etiquetaAnimo, haceDias, iso, leyendaUmbral } from "@/lib/nexus/bienestar";
import { useUmbralAgregacion } from "@/hooks/use-umbral";

/** Comentarios del pulso, desligados de la persona. Solo Dirección de Talento. */
export function ComentariosAnimo() {
  const { umbral } = useUmbralAgregacion();
  const desde = iso(haceDias(90));
  const hasta = iso(new Date());
  const { data, isLoading } = useQuery({
    queryKey: ["animo-comentarios", desde, hasta],
    queryFn: async () => {
      const { data: r } = await supabase.rpc("animo_comentarios", { _desde: desde, _hasta: hasta });
      return r ?? [];
    },
  });

  return (
    <section className="border border-border bg-card p-4">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-cota">
        Comentarios del pulso
      </h2>
      <p className="mt-1 text-[11px] text-cota">{avisoComentariosTalento(umbral)}</p>
      {isLoading ? (
        <div className="mt-3">
          <EsqueletoTabla filas={4} columnas={2} />
        </div>
      ) : (data ?? []).length === 0 ? (
        <p className="mt-3 text-[13px] text-cota">
          No hay suficientes comentarios en los últimos 90 días para desplegarlos sin comprometer el
          anonimato.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border border-t border-border">
          {(data ?? []).map((c, i) => (
            <li key={i} className="py-2.5">
              <p className="text-[13px] text-grafito">{c.comentario}</p>
              <p className="cifra mt-0.5 text-[11px] text-cota">
                Ánimo del día: {etiquetaAnimo(c.valor)}
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 border-t border-border pt-2 text-[11px] text-cota">{leyendaUmbral(umbral)}</p>
    </section>
  );
}