import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TarjetaIndicador } from "@/components/nexus/tarjeta-indicador";
import { EsqueletoIndicadores } from "@/components/nexus/esqueletos";
import { fechaCorta } from "@/lib/nexus/formato";
import { CICLO_ACTUAL, semaforoCertificacion } from "@/lib/nexus/desarrollo";

/**
 * Cuatro indicadores del módulo Desarrollo. Ninguno aparece sin fórmula,
 * fuente y fecha de corte; cuando no hay base de cálculo se dice así,
 * nunca se rellena con cero.
 */
export function IndicadoresDesarrollo({ ciclo = CICLO_ACTUAL }: { ciclo?: string }) {
  const hoy = fechaCorta(new Date());

  const { data, isLoading } = useQuery({
    queryKey: ["desarrollo-indicadores", ciclo],
    retry: 3,
    queryFn: async () => {
      const [colaboradores, agendas, acciones, certificaciones] = await Promise.all([
        supabase.from("colaboradores").select("id").eq("estatus", "activo"),
        supabase
          .from("agendas_desarrollo")
          .select("id, colaborador_id, estatus")
          .eq("ciclo", ciclo),
        supabase
          .from("acciones_desarrollo")
          .select("id, estatus, monto_inversion, via_aprendizaje"),
        supabase.from("certificaciones").select("id, fecha_vencimiento, costo"),
      ]);
      return {
        colaboradores: colaboradores.data ?? [],
        agendas: agendas.data ?? [],
        acciones: acciones.data ?? [],
        certificaciones: certificaciones.data ?? [],
      };
    },
  });

  if (isLoading || !data) return <EsqueletoIndicadores cantidad={4} />;

  const activos = data.colaboradores.length;
  const conAgenda = new Set(
    data.agendas.map((a) => a.colaborador_id).filter((x): x is string => !!x),
  ).size;
  const cobertura = activos === 0 ? null : (conAgenda / activos) * 100;

  const vigentesAcciones = data.acciones.filter((a) => a.estatus !== "cancelada");
  const concluidas = vigentesAcciones.filter((a) => a.estatus === "concluida").length;
  const avance =
    vigentesAcciones.length === 0 ? null : (concluidas / vigentesAcciones.length) * 100;

  const certs = data.certificaciones;
  const vigentes = certs.filter((c) => semaforoCertificacion(c.fecha_vencimiento) === "vigente");
  const pctVigentes = certs.length === 0 ? null : (vigentes.length / certs.length) * 100;

  const comprometida = data.acciones.reduce((s, a) => s + (a.monto_inversion ?? 0), 0);
  const ejercida = data.acciones
    .filter((a) => a.estatus === "concluida")
    .reduce((s, a) => s + (a.monto_inversion ?? 0), 0);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <TarjetaIndicador
        titulo="Cobertura de agendas"
        valor={cobertura ?? 0}
        meta={100}
        min={0}
        max={100}
        unidad="%"
        decimales={0}
        etiquetaMeta="Meta"
        formula="Colaboradores activos con agenda del ciclo ÷ colaboradores activos × 100"
        fuente={`Nexus · ciclo ${ciclo} · ${activos} personas activas`}
        fechaCorte={hoy}
        nota={
          cobertura === null ? (
            <p className="text-[12px] text-cota">
              No calculable: no hay colaboradores activos registrados.
            </p>
          ) : undefined
        }
      />
      <TarjetaIndicador
        titulo="Avance de acciones"
        valor={avance ?? 0}
        meta={80}
        min={0}
        max={100}
        unidad="%"
        decimales={0}
        etiquetaMeta="Línea base"
        formula="Acciones concluidas ÷ acciones vigentes × 100 (las canceladas quedan fuera)"
        fuente={`Nexus · ${vigentesAcciones.length} acciones vigentes`}
        fechaCorte={hoy}
        nota={
          avance === null ? (
            <p className="text-[12px] text-cota">
              No calculable: todavía no hay acciones de desarrollo registradas.
            </p>
          ) : undefined
        }
      />
      <TarjetaIndicador
        titulo="Certificaciones vigentes"
        valor={pctVigentes ?? 0}
        meta={100}
        min={0}
        max={100}
        unidad="%"
        decimales={0}
        etiquetaMeta="Meta"
        formula="Certificaciones con vencimiento a más de 90 días ÷ certificaciones registradas × 100"
        fuente={`Nexus · ${certs.length} certificaciones registradas`}
        fechaCorte={hoy}
        nota={
          pctVigentes === null ? (
            <p className="text-[12px] text-cota">
              No calculable: no hay certificaciones registradas.
            </p>
          ) : undefined
        }
      />
      <TarjetaIndicador
        titulo="Inversión ejercida"
        valor={ejercida}
        meta={comprometida}
        min={0}
        max={Math.max(comprometida, ejercida, 1)}
        unidad=" MXN"
        decimales={0}
        etiquetaMeta="Comprometida"
        sentido="menorEsMejor"
        formula="Suma de montos de acciones concluidas contra la suma comprometida en el plan"
        fuente="Nexus · acciones de desarrollo con monto capturado"
        fechaCorte={hoy}
        nota={
          comprometida === 0 ? (
            <p className="text-[12px] text-cota">
              No calculable: ninguna acción tiene monto de inversión capturado.
            </p>
          ) : undefined
        }
      />
    </div>
  );
}
