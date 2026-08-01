import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CloudSun, Thermometer } from "lucide-react";
import { SelectorBuscador } from "@/components/nexus/selector-buscador";
import { EsqueletoTabla } from "@/components/nexus/esqueletos";
import { BannerAviso } from "@/components/nexus/banner-aviso";
import { Label } from "@/components/ui/label";
import { fechaCorta, numero } from "@/lib/nexus/formato";
import { cn } from "@/lib/utils";
import {
  avisoAnonimato,
  avisoSuprimido,
  CORTES,
  leyendaUmbral,
  reactivoDe,
  type Corte,
} from "@/lib/nexus/bienestar";
import { useUmbralAgregacion } from "@/hooks/use-umbral";
import { useEncuestas } from "./datos";

export function Clima() {
  const { data, isLoading } = useEncuestas();
  const { umbral } = useUmbralAgregacion();
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

  const { data: definicion } = useQuery({
    queryKey: ["clima-definicion-grupos", encuestaId],
    enabled: !!encuestaId,
    queryFn: async () => {
      const { data: r } = await supabase.rpc("definicion_grupos_encuesta", {
        _encuesta: encuestaId,
      });
      return r?.[0] ?? null;
    },
  });

  if (isLoading) return <EsqueletoTabla filas={6} columnas={4} />;

  if (conRespuestas.length === 0)
    return (
      <BannerAviso tono="info">Ninguna encuesta tiene respuestas todavía.</BannerAviso>
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

      <BannerAviso tono="confidencial" ojoTachado titulo="Datos agregados, nunca individuales">
        {avisoAnonimato(umbral)} {leyendaUmbral(umbral)}
        {encuesta?.fecha_fin ? ` Levantamiento cerrado al ${fechaCorta(encuesta.fecha_fin)}.` : ""}
      </BannerAviso>

      {corte === "grupo" ? (
        definicion ? (
          <BannerAviso
            tono={definicion.difiere ? "alerta" : "info"}
            titulo="Definición de grupos de reporte"
          >
            Estos resultados se calculan con la definición congelada al abrir la encuesta (
            {fechaCorta(definicion.congelado_en)}).
            {definicion.difiere
              ? " La definición vigente del catálogo difiere de esta: reacomodar grupos no altera encuestas ya abiertas."
              : " Coincide con la definición vigente del catálogo."}
          </BannerAviso>
        ) : (
          <BannerAviso tono="alerta">
            Esta encuesta no tiene una definición congelada de grupos: se reporta con el catálogo
            vigente de Configuración › Grupos de reporte.
          </BannerAviso>
        )
      ) : null}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-cota">
          <CloudSun className="h-4 w-4 text-info" aria-hidden />
          eNPS por {CORTES.find((c) => c.valor === corte)?.etiqueta.toLowerCase()}
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {(enps ?? []).map((g) => (
            <article
              key={g.grupo}
              className="rounded-2xl bg-card p-5 shadow-[var(--shadow-tarjeta)]"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[13px] font-semibold text-grafito">{g.grupo}</h3>
                <span className="cifra text-[11px] text-cota">{g.personas} respondientes</span>
              </div>
              {g.suprimido || g.enps === null ? (
                <BannerAviso tono="alerta" className="mt-3">
                  {avisoSuprimido(umbral)}
                </BannerAviso>
              ) : (
                <>
                  <p
                    className={cn(
                      "cifra mt-2 text-[38px] font-bold leading-none tracking-tight",
                      Number(g.enps) >= 0 ? "text-exito" : "text-riesgo",
                    )}
                  >
                    {numero(Number(g.enps), 1)}
                    <span className="ml-1 text-base font-medium text-cota">pts</span>
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
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-cota">
          <Thermometer className="h-4 w-4 text-alerta" aria-hidden />
          Dimensiones (escala 1 a 5)
        </h2>
        {visibles.length === 0 ? (
          <BannerAviso tono="alerta">{avisoSuprimido(umbral)}</BannerAviso>
        ) : (
          <div className="space-y-4">
            {visibles.map((g) => (
              <article
                key={g.grupo}
                className="rounded-2xl bg-card p-5 shadow-[var(--shadow-tarjeta)]"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[13px] font-semibold text-grafito">{g.grupo}</h3>
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
                          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-2 rounded-full bg-linear-to-r transition-[width] duration-500",
                                Number(r.promedio) >= 4
                                  ? "from-exito/60 to-exito"
                                  : Number(r.promedio) >= 3
                                    ? "from-alerta/60 to-alerta"
                                    : "from-riesgo/60 to-riesgo",
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
            Cortes suprimidos por debajo de {umbral} respondientes:{" "}
            {suprimidos.map((g) => `${g.grupo} (${g.personas})`).join(", ")}.
          </p>
        ) : null}
        <p className="cifra text-[11px] text-cota">{leyendaUmbral(umbral)}</p>
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
      <div className="flex h-2.5 w-full overflow-hidden rounded-full">
        <div className="bg-exito" style={{ width: `${pct(promotores)}%` }} aria-hidden />
        <div className="bg-cota/40" style={{ width: `${pct(pasivos)}%` }} aria-hidden />
        <div className="bg-riesgo" style={{ width: `${pct(detractores)}%` }} aria-hidden />
      </div>
      <p className="cifra mt-1.5 text-[11px] text-cota">
        {promotores} promotores (9–10) · {pasivos} pasivos (7–8) · {detractores} detractores (0–6)
      </p>
    </div>
  );
}