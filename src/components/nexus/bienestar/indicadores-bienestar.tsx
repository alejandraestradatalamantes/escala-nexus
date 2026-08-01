import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Gauge, Medal, Smile } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TarjetaIndicador } from "@/components/nexus/tarjeta-indicador";
import { TarjetaNoCalculable } from "@/components/nexus/tarjeta-no-calculable";
import { EsqueletoIndicadores } from "@/components/nexus/esqueletos";
import { fechaCorta, numero } from "@/lib/nexus/formato";
import { haceDias, iso } from "@/lib/nexus/bienestar";
import { useUmbralAgregacion } from "@/hooks/use-umbral";
import {
  PERIODO_ANIMO_DIAS,
  PERIODO_RECONOCIMIENTOS_DIAS,
  useAnimoFirma,
  useEncuestas,
  useParticipacionReconocimientos,
  useSupuestosBienestar,
} from "./datos";

interface Props {
  veAgregadoFirma: boolean;
  esLider: boolean;
}

function useEnpsFirma(encuestaId: string | null) {
  return useQuery({
    queryKey: ["clima-enps-firma", encuestaId],
    enabled: !!encuestaId,
    queryFn: async () => {
      const { data } = await supabase.rpc("clima_enps", {
        _encuesta: encuestaId as string,
        _corte: "firma",
      });
      return data?.[0] ?? null;
    },
  });
}

function useAnimoEquipo(activo: boolean) {
  const desde = iso(haceDias(PERIODO_ANIMO_DIAS));
  const hasta = iso(new Date());
  return useQuery({
    queryKey: ["animo-equipo", desde, hasta],
    enabled: activo,
    queryFn: async () => {
      const { data } = await supabase.rpc("animo_equipo", { _desde: desde, _hasta: hasta });
      return data?.[0] ?? null;
    },
  });
}

/** Indicadores de Bienestar. Ninguno se despliega por debajo del umbral vigente de agregación. */
export function IndicadoresBienestar({ veAgregadoFirma, esLider }: Props) {
  const { umbral } = useUmbralAgregacion();
  const corte = fechaCorta(new Date());
  const inicioPeriodo = fechaCorta(haceDias(PERIODO_ANIMO_DIAS));

  const { data: enc, isLoading: cargandoEnc } = useEncuestas();
  const { data: sup } = useSupuestosBienestar();
  const conRespuestas = enc?.encuestas.filter((e) => e.avance > 0) ?? [];
  const encuestaEnps = conRespuestas[0] ?? null;
  const vigente = enc?.encuestas.find((e) => e.estatus === "vigente") ?? null;

  const { data: enps, isLoading: cargandoEnps } = useEnpsFirma(
    veAgregadoFirma ? (encuestaEnps?.id ?? null) : null,
  );
  const { data: animo, isLoading: cargandoAnimo } = useAnimoFirma(veAgregadoFirma);
  const { data: equipo } = useAnimoEquipo(esLider && !veAgregadoFirma);
  const { data: participacion, isLoading: cargandoPart } = useParticipacionReconocimientos();

  if (cargandoEnc || cargandoEnps || cargandoAnimo || cargandoPart)
    return <EsqueletoIndicadores cantidad={veAgregadoFirma ? 4 : 2} />;

  const plantilla = enc?.plantilla ?? 0;
  const metaEnps = sup?.enpsMeta ?? null;
  const lineaBaseEnps = sup?.enpsLineaBase ?? null;
  const pctParticipacion =
    participacion && participacion.plantilla > 0
      ? (participacion.personas / participacion.plantilla) * 100
      : null;
  const cobertura = vigente && plantilla > 0 ? (vigente.avance / plantilla) * 100 : null;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {veAgregadoFirma ? (
        !encuestaEnps || !enps || enps.suprimido || enps.enps === null || metaEnps === null ? (
          <TarjetaNoCalculable
            titulo="eNPS del periodo"
            icono={Gauge}
            razon={
              !encuestaEnps
                ? "Ninguna encuesta tiene respuestas todavía."
                : enps?.suprimido
                  ? `Menos de ${umbral} respondientes: desplegarlo comprometería el anonimato.`
                  : "Falta la meta de eNPS en Configuración › Supuestos (clave enps_meta)."
            }
            formula="% promotores (9 y 10) − % detractores (0 a 6)"
            fuente={`Respuestas de encuesta, reactivo de recomendación · agregado con mínimo de ${umbral} personas`}
            fechaCorte={corte}
          />
        ) : (
          <TarjetaIndicador
            titulo="eNPS del periodo"
            icono={Gauge}
            valor={Number(enps.enps)}
            meta={Number(metaEnps)}
            min={-100}
            max={100}
            unidad=" pts"
            decimales={1}
            sentido="mayorEsMejor"
            etiquetaMeta="Meta"
            formula="% promotores (9 y 10) − % detractores (0 a 6)"
            fuente={`${encuestaEnps.nombre} · ${enps.personas} respondientes · agregado, nunca individual`}
            fechaCorte={corte}
            nota={
              <p className="text-[11px] text-cota">
                {enps.promotores} promotores · {enps.pasivos} pasivos · {enps.detractores}{" "}
                detractores.
                {lineaBaseEnps === null
                  ? " Línea base pendiente en Configuración."
                  : ` Línea base ${numero(Number(lineaBaseEnps), 0)} pts (Configuración).`}
              </p>
            }
          />
        )
      ) : null}

      {veAgregadoFirma ? (
        !animo || animo.suprimido || animo.promedio === null || sup?.animoMeta == null ? (
          <TarjetaNoCalculable
            titulo="Ánimo promedio del periodo"
            icono={Smile}
            razon={
              animo?.suprimido
                ? `Menos de ${umbral} personas registraron pulso en el periodo. No se despliega.`
                : "Falta la meta de ánimo en Configuración › Supuestos (clave animo_meta)."
            }
            formula="Promedio de los pulsos registrados en los últimos 30 días (escala 1 a 5)"
            fuente={`Pulsos de ánimo · agregado con mínimo de ${umbral} personas`}
            fechaCorte={corte}
          />
        ) : (
          <TarjetaIndicador
            titulo="Ánimo promedio del periodo"
            icono={Smile}
            valor={Number(animo.promedio)}
            meta={Number(sup.animoMeta)}
            min={1}
            max={5}
            unidad=""
            decimales={2}
            sentido="mayorEsMejor"
            etiquetaMeta="Meta"
            formula="Promedio de los pulsos registrados en los últimos 30 días (escala 1 a 5)"
            fuente={`Pulsos de ánimo · ${animo.personas} personas, ${animo.registros} registros · ${inicioPeriodo} a ${corte}`}
            fechaCorte={corte}
            nota={
              <p className="text-[11px] text-cota">
                Promedio de firma. El pulso individual no es visible para nadie.
              </p>
            }
          />
        )
      ) : null}

      {esLider && !veAgregadoFirma ? (
        !equipo || equipo.suprimido || equipo.promedio === null ? (
          <TarjetaNoCalculable
            titulo="Ánimo de tu equipo"
            icono={Smile}
            razon={`Tu equipo tiene menos de ${umbral} personas con pulso registrado en el periodo. No se despliega, y el pulso individual nunca se muestra.`}
            formula="Promedio de los pulsos de tu equipo directo en los últimos 30 días (escala 1 a 5)"
            fuente={`Pulsos de ánimo · agregado con mínimo de ${umbral} personas`}
            fechaCorte={corte}
          />
        ) : (
          <TarjetaIndicador
            titulo="Ánimo de tu equipo"
            icono={Smile}
            valor={Number(equipo.promedio)}
            meta={Number(sup?.animoMeta ?? 4)}
            min={1}
            max={5}
            unidad=""
            decimales={2}
            sentido="mayorEsMejor"
            etiquetaMeta="Meta"
            formula="Promedio de los pulsos de tu equipo directo en los últimos 30 días (escala 1 a 5)"
            fuente={`Pulsos de ánimo · ${equipo.personas} personas de tu equipo · ${inicioPeriodo} a ${corte}`}
            fechaCorte={corte}
            nota={
              <p className="text-[11px] text-cota">
                Solo el promedio. Ni el pulso ni el comentario de una persona son visibles para su
                líder.
              </p>
            }
          />
        )
      ) : null}

      {pctParticipacion === null || sup?.participacionMeta == null ? (
        <TarjetaNoCalculable
          titulo="Participación en reconocimientos"
          icono={Medal}
          razon={
            pctParticipacion === null
              ? "No hay plantilla activa registrada."
              : "Falta la meta de participación en Configuración › Supuestos."
          }
          formula="Personas que dieron o recibieron un reconocimiento ÷ plantilla activa × 100"
          fuente="Tabla reconocimientos · tabla colaboradores"
          fechaCorte={corte}
        />
      ) : (
        <TarjetaIndicador
          titulo="Participación en reconocimientos"
          icono={Medal}
          valor={pctParticipacion}
          meta={Number(sup.participacionMeta)}
          min={0}
          max={100}
          unidad="%"
          decimales={1}
          sentido="mayorEsMejor"
          etiquetaMeta="Meta"
          formula="Personas que dieron o recibieron un reconocimiento ÷ plantilla activa × 100"
          fuente={`Últimos ${PERIODO_RECONOCIMIENTOS_DIAS} días · ${participacion?.personas} de ${participacion?.plantilla} personas`}
          fechaCorte={corte}
        />
      )}

      {veAgregadoFirma ? (
        cobertura === null || !vigente ? (
          <TarjetaNoCalculable
            titulo="Cobertura de la encuesta vigente"
            icono={ClipboardList}
            razon={
              vigente
                ? "No hay plantilla activa registrada para formar el denominador."
                : "No hay ninguna encuesta vigente en este momento."
            }
            formula="Respondientes ÷ plantilla activa × 100"
            fuente="Función de avance de encuesta · devuelve cuántas van, nunca quiénes"
            fechaCorte={corte}
          />
        ) : (
          <TarjetaIndicador
            titulo="Cobertura de la encuesta vigente"
            icono={ClipboardList}
            valor={cobertura}
            meta={Number(vigente.cobertura_objetivo ?? 80)}
            min={0}
            max={100}
            unidad="%"
            decimales={1}
            sentido="mayorEsMejor"
            etiquetaMeta="Objetivo"
            formula="Respondientes ÷ plantilla activa × 100"
            fuente={`${vigente.nombre} · ${vigente.avance} de ${plantilla} personas · el sistema cuenta cuántas van, nunca quiénes`}
            fechaCorte={corte}
          />
        )
      ) : null}
    </div>
  );
}