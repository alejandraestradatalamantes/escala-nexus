import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TarjetaIndicador } from "@/components/nexus/tarjeta-indicador";
import { TarjetaNoCalculable } from "@/components/nexus/tarjeta-no-calculable";
import { EsqueletoIndicadores } from "@/components/nexus/esqueletos";
import { fechaCorta, numero } from "@/lib/nexus/formato";
import {
  HORAS_JORNADA,
  UMBRAL_POR_OMISION,
  cubre,
  diasHabiles,
  diasHabilesDelPeriodo,
  diasHabilesDesde,
  esAusentismo,
  iso,
} from "@/lib/nexus/tiempo";

export function useDatosTiempo() {
  return useQuery({
    queryKey: ["tiempo-indicadores"],
    retry: 3,
    queryFn: async () => {
      const [cols, saldos, sols, supuestos] = await Promise.all([
        supabase.from("colaboradores").select("id").eq("estatus", "activo"),
        supabase.from("saldos_vacaciones").select("colaborador_id, dias_disponibles"),
        supabase
          .from("solicitudes")
          .select("id, tipo, estatus, fecha_inicio, fecha_fin, dias, fecha_solicitud"),
        supabase.from("supuestos_financieros").select("clave, valor"),
      ]);
      const valorDe = (clave: string) =>
        supuestos.data?.find((s) => s.clave === clave)?.valor ?? null;
      return {
        plantilla: cols.data?.length ?? 0,
        saldos: saldos.data ?? [],
        solicitudes: sols.data ?? [],
        costoHora: valorDe("costo_hora_promedio"),
        umbral: valorDe("dias_habiles_respuesta_solicitud") ?? UMBRAL_POR_OMISION,
      };
    },
  });
}

/** Cuatro indicadores del módulo Tiempo, con fórmula, fuente y corte visibles. */
export function IndicadoresTiempo() {
  const { data, isLoading } = useDatosTiempo();
  const ahora = new Date();
  const hoy = iso(ahora);
  const corte = fechaCorta(ahora);

  if (isLoading || !data) return <EsqueletoIndicadores cantidad={4} />;

  const { plantilla, saldos, solicitudes, costoHora, umbral } = data;

  const diasNoTomados = saldos.reduce((a, s) => a + Number(s.dias_disponibles ?? 0), 0);
  const pasivo = costoHora === null ? null : diasNoTomados * HORAS_JORNADA * costoHora;

  const pendientes = solicitudes.filter((s) => s.estatus === "pendiente");
  const fueraDeTiempo = pendientes.filter(
    (s) => diasHabilesDesde(s.fecha_solicitud, ahora) > umbral,
  );
  const pctFuera = pendientes.length ? (fueraDeTiempo.length / pendientes.length) * 100 : null;

  const inicioPeriodo = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 12);
  const habilesPeriodo = diasHabilesDelPeriodo(inicioPeriodo, ahora);
  const diasAusentismo = solicitudes
    .filter((s) => s.estatus === "aprobada" && esAusentismo(s.tipo))
    .reduce((a, s) => {
      if (!s.fecha_inicio || !s.fecha_fin) return a;
      const desde = s.fecha_inicio < iso(inicioPeriodo) ? iso(inicioPeriodo) : s.fecha_inicio;
      const hasta = s.fecha_fin > hoy ? hoy : s.fecha_fin;
      return a + diasHabiles(desde, hasta);
    }, 0);
  const pctAusentismo =
    plantilla > 0 && habilesPeriodo > 0
      ? (diasAusentismo / (plantilla * habilesPeriodo)) * 100
      : null;

  const ausentesHoy = new Set(
    solicitudes
      .filter((s) => s.estatus === "aprobada" && cubre(s, hoy))
      .map((s) => s.id && s),
  );
  const idsAusentes = new Set(
    solicitudes.filter((s) => s.estatus === "aprobada" && cubre(s, hoy)).map((s) => s.id),
  );
  void ausentesHoy;
  const disponibles = plantilla - idsAusentes.size;
  const pctDisponible = plantilla > 0 ? (disponibles / plantilla) * 100 : null;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {saldos.length === 0 ? (
        <TarjetaNoCalculable
          titulo="Días de vacaciones no tomados"
          razon="No hay saldos de vacaciones calculados. Se derivan de la fecha de ingreso y del catálogo del artículo 76 en Configuración."
          formula="Suma de días disponibles de la plantilla activa"
          fuente="Tabla saldos_vacaciones"
          fechaCorte={corte}
        />
      ) : (
        <TarjetaIndicador
          titulo="Días de vacaciones no tomados"
          valor={diasNoTomados}
          meta={0}
          min={0}
          max={Math.max(diasNoTomados, 1)}
          unidad=" días"
          decimales={1}
          sentido="menorEsMejor"
          etiquetaMeta="Línea base"
          formula="Suma de días disponibles de la plantilla activa (todo saldo acumulado es pasivo)"
          fuente={`Tabla saldos_vacaciones · ${saldos.length} saldos calculados`}
          fechaCorte={corte}
          nota={
            <p className="text-[11px] text-cota">
              {pasivo === null
                ? "Costo del pasivo no calculable: falta el supuesto costo_hora_promedio en Configuración."
                : `Pasivo estimado ${numero(pasivo, 0)} MXN (días × ${HORAS_JORNADA} h × costo por hora ${numero(costoHora, 2)}).`}
            </p>
          }
        />
      )}

      {pctFuera === null ? (
        <TarjetaNoCalculable
          titulo="Solicitudes fuera de tiempo de respuesta"
          razon="No hay solicitudes pendientes en este momento, así que el porcentaje no tiene denominador."
          formula={`Pendientes con más de ${umbral} días hábiles desde la solicitud ÷ pendientes totales × 100`}
          fuente="Tabla solicitudes · umbral en Configuración › Supuestos"
          fechaCorte={corte}
          cifra={<span className="text-cota">Sin pendientes</span>}
        />
      ) : (
        <TarjetaIndicador
          titulo="Solicitudes fuera de tiempo de respuesta"
          valor={pctFuera}
          meta={0}
          min={0}
          max={100}
          unidad="%"
          decimales={1}
          sentido="menorEsMejor"
          etiquetaMeta="Meta"
          formula={`Pendientes con más de ${umbral} días hábiles desde la solicitud ÷ pendientes totales × 100`}
          fuente={`Tabla solicitudes · umbral ${umbral} días hábiles (Configuración) · ${fueraDeTiempo.length} de ${pendientes.length}`}
          fechaCorte={corte}
        />
      )}

      {pctAusentismo === null ? (
        <TarjetaNoCalculable
          titulo="Ausentismo del periodo"
          razon="Falta plantilla activa o días hábiles transcurridos en el mes para formar el denominador."
          formula="Días de incapacidad y falta ÷ (plantilla activa × días hábiles del periodo) × 100"
          fuente="Tabla solicitudes · tabla colaboradores"
          fechaCorte={corte}
        />
      ) : (
        <TarjetaIndicador
          titulo="Ausentismo del periodo"
          valor={pctAusentismo}
          meta={2}
          min={0}
          max={10}
          unidad="%"
          decimales={2}
          sentido="menorEsMejor"
          etiquetaMeta="Meta"
          formula="Días hábiles de incapacidad y falta ÷ (plantilla activa × días hábiles del periodo) × 100"
          fuente={`Tabla solicitudes · periodo ${fechaCorta(inicioPeriodo)} a ${corte} (${habilesPeriodo} días hábiles, ${numero(diasAusentismo, 0)} días-persona)`}
          fechaCorte={corte}
        />
      )}

      {pctDisponible === null ? (
        <TarjetaNoCalculable
          titulo="Personal disponible hoy"
          razon="No hay plantilla activa registrada."
          formula="(Plantilla activa − ausencias aprobadas que cruzan la fecha de corte) ÷ plantilla activa × 100"
          fuente="Tabla colaboradores · tabla solicitudes"
          fechaCorte={corte}
        />
      ) : (
        <TarjetaIndicador
          titulo="Personal disponible hoy"
          valor={pctDisponible}
          meta={95}
          min={0}
          max={100}
          unidad="%"
          decimales={1}
          sentido="mayorEsMejor"
          etiquetaMeta="Meta"
          formula="(Plantilla activa − ausencias aprobadas que cruzan la fecha de corte) ÷ plantilla activa × 100"
          fuente={`Tabla colaboradores · tabla solicitudes · ${disponibles} de ${plantilla} personas`}
          fechaCorte={corte}
        />
      )}
    </div>
  );
}