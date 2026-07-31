import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SelectorBuscador } from "@/components/nexus/selector-buscador";
import { EsqueletoTabla } from "@/components/nexus/esqueletos";
import { Label } from "@/components/ui/label";
import { fechaCorta, numero } from "@/lib/nexus/formato";
import { cn } from "@/lib/utils";
import {
  AVISO_ANONIMATO,
  AVISO_SUPRIMIDO,
  CORTES,
  MINIMO_AGREGACION,
  reactivoDe,
  type Corte,
} from "@/lib/nexus/bienestar";
import { useEncuestas } from "./datos";

export function Clima() {
  const { data, isLoading } = useEncuestas();
  const [encuestaId, setEncuestaId] = useState("");
  const [corte, setCorte] = useState<Corte>("firma");

  const conRespuestas = data?.encuestas.filter((e) => e.avance > 0) ?? [];

  useEffect(() => {
    if (!encuestaId && conRespuestas.length > 0) setEncuestaId(conRespuestas[0].id);
  }, [conRespuestas, encuestaId]);

  const { data: enps } = useQuery({
    queryKey: ["clima-enps", encuestaId, corte],
    enabled: !!encuestaId,
    queryFn: async () => {
      const { data: r } = await supabase.rpc("clima_enps", { _encuesta: encuestaId, _corte: corte });
      return r ?? [];
    },
  });

  const { data: reactivos } = useQuery({
    queryKey: ["clima-reactivos", encuestaId, corte],
    enabled: !!encuestaId,
    queryFn: async () => {
      const { data: r } = await supabase.rpc("clima_reactivos", {
        _encuesta: encuestaId,
        _corte: corte,
      });
      return r ?? [];
    },
  });

  const { data: grupos } = useQuery({
    queryKey: ["clima-grupos", encuestaId, corte],
    enabled: !!encuestaId,
    queryFn: async () => {
      const { data: r } = await supabase.rpc("clima_grupos", {
        _encuesta: encuestaId,
        _corte: corte,
      });
      return r ?? [];
    },
  });

  if (isLoading) return <EsqueletoTabla filas={6} columnas={4} />;

  if (conRespuestas.length === 0)
    return (
      <p className="border border-border bg-card p-4 text-[13px] text-cota">
        Ninguna encuesta tiene respuestas todavía.
      </p>
    );

  const encuesta = conRespuestas.find((e) => e.id === encuestaId) ?? null;
  const visibles = (grupos ?? []).filter((g) => !g.suprimido);
  const suprimidos = (grupos ?? []).filter((g) => g.suprimido);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <div className="w-full max-w-[26rem]">
          <Label className="cifra text-[11px] uppercase tracking-wide text-cota">Encuesta</Label>
          <SelectorBuscador
            className="mt-1"
            ariaLabel="Encuesta"
            valor={encuestaId}
            onCambio={setEncuestaId}
            opciones={conRespuestas.map((e) => ({
              valor: e.id,
              etiqueta: e.nombre,
              detalle: `${e.estatus} · ${e.avance} respondientes`,
            }))}
          />
        </div>
        <div className="w-full max-w-56">
          <Label className="cifra text-[11px] uppercase tracking-wide text-cota">Corte</Label>
          <SelectorBuscador
            className="mt-1"
            ariaLabel="Corte de análisis"
            valor={corte}
            onCambio={(v) => setCorte(v as Corte)}
            opciones={CORTES.map((c) => ({ valor: c.valor, etiqueta: c.etiqueta }))}
          />
        </div>
      </div>

      <p className="text-[11px] text-cota">
        {AVISO_ANONIMATO} Los cortes con menos de {MINIMO_AGREGACION} respondientes no se despliegan.
        {encuesta?.fecha_fin ? ` Levantamiento cerrado al ${fechaCorta(encuesta.fecha_fin)}.` : ""}
      </p>

      <section className="space-y-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-cota">
          eNPS por {CORTES.find((c) => c.valor === corte)?.etiqueta.toLowerCase()}
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {(enps ?? []).map((g) => (
            <article key={g.grupo} className="border border-border bg-card p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[13px] text-grafito">{g.grupo}</h3>
                <span className="cifra text-[11px] text-cota">{g.personas} respondientes</span>
              </div>
              {g.suprimido || g.enps === null ? (
                <p className="cifra mt-2 border-l-2 border-casco bg-casco/10 px-2 py-1.5 text-[11px] text-grafito">
                  {AVISO_SUPRIMIDO}
                </p>
              ) : (
                <>
                  <p className="cifra mt-2 text-[32px] leading-none text-grafito">
                    {numero(Number(g.enps), 1)}
                    <span className="ml-1 text-base text-cota">pts</span>
                  </p>
                  <Desglose
                    promotores={g.promotores ?? 0}
                    pasivos={g.pasivos ?? 0}
                    detractores={g.detractores ?? 0}
                  />
                </>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-cota">
          Dimensiones (escala 1 a 5)
        </h2>
        {visibles.length === 0 ? (
          <p className="border border-border bg-card p-4 text-[13px] text-cota">{AVISO_SUPRIMIDO}</p>
        ) : (
          <div className="space-y-4">
            {visibles.map((g) => (
              <article key={g.grupo} className="border border-border bg-card p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[13px] text-grafito">{g.grupo}</h3>
                  <span className="cifra text-[11px] text-cota">{g.personas} respondientes</span>
                </div>
                <ul className="mt-3 space-y-2.5">
                  {(reactivos ?? [])
                    .filter((r) => r.grupo === g.grupo && r.reactivo_id !== "enps")
                    .map((r) => {
                      const meta = reactivoDe(r.reactivo_id);
                      const pct = ((Number(r.promedio) - 1) / 4) * 100;
                      return (
                        <li key={r.reactivo_id}>
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="text-[12px] text-grafito">
                              {meta?.dimension ?? r.reactivo_id}
                            </span>
                            <span className="cifra text-[12px] text-grafito">
                              {numero(Number(r.promedio), 2)}
                            </span>
                          </div>
                          <div className="mt-1 h-[3px] w-full bg-cota/20">
                            <div
                              className={cn(
                                "h-[3px]",
                                Number(r.promedio) >= 4 ? "bg-linea" : "bg-desviacion",
                              )}
                              style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[11px] text-cota">{meta?.texto}</p>
                        </li>
                      );
                    })}
                </ul>
              </article>
            ))}
          </div>
        )}
        {suprimidos.length > 0 ? (
          <p className="text-[11px] text-cota">
            Cortes suprimidos por tener menos de {MINIMO_AGREGACION} respondientes:{" "}
            {suprimidos.map((g) => `${g.grupo} (${g.personas})`).join(", ")}.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function Desglose({
  promotores,
  pasivos,
  detractores,
}: {
  promotores: number;
  pasivos: number;
  detractores: number;
}) {
  const total = promotores + pasivos + detractores || 1;
  const pct = (n: number) => (n / total) * 100;
  return (
    <div className="mt-3">
      <div className="flex h-2.5 w-full overflow-hidden">
        <div className="bg-linea" style={{ width: `${pct(promotores)}%` }} aria-hidden />
        <div className="bg-cota/40" style={{ width: `${pct(pasivos)}%` }} aria-hidden />
        <div className="bg-desviacion" style={{ width: `${pct(detractores)}%` }} aria-hidden />
      </div>
      <p className="cifra mt-1.5 text-[11px] text-cota">
        {promotores} promotores (9–10) · {pasivos} pasivos (7–8) · {detractores} detractores (0–6)
      </p>
    </div>
  );
}