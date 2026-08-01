import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TarjetaIndicador } from "@/components/nexus/tarjeta-indicador";
import { TarjetaNoCalculable } from "@/components/nexus/tarjeta-no-calculable";
import { EsqueletoIndicadores } from "@/components/nexus/esqueletos";
import { Award, BadgeCheck, CalendarClock, HardHat, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSesion } from "@/hooks/use-sesion";
import { antiguedadAnios, ETIQUETA_ROL, fechaCorta } from "@/lib/nexus/formato";
import { esCertificacionVigente } from "@/lib/nexus/desarrollo";

export const Route = createFileRoute("/_authenticated/tablero")({
  head: () => ({
    meta: [
      { title: "Tablero — ESCALA Nexus" },
      { name: "description", content: "Indicadores de plantilla, antigüedad y certificaciones con línea base." },
      { property: "og:title", content: "Tablero — ESCALA Nexus" },
      { property: "og:description", content: "Indicadores de talento con línea base y desviación." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Tablero,
});

function Tablero() {
  const { sesion, roles, cargando } = useSesion();
  const hoy = fechaCorta(new Date());

  const { data, isLoading } = useQuery({
    queryKey: ["tablero-indicadores"],
    retry: 3,
    queryFn: async () => {
      const [cols, certs, supuesto] = await Promise.all([
        supabase.from("colaboradores").select("id, fecha_ingreso, ubicacion").eq("estatus", "activo"),
        supabase.from("certificaciones").select("id, fecha_vencimiento"),
        supabase.from("supuestos_financieros").select("valor").eq("clave", "plantilla_autorizada").maybeSingle(),
      ]);
      const colaboradores = cols.data ?? [];
      const certificaciones = certs.data ?? [];
      // Vigente = vence en la fecha de corte o después. Sin holgura de 90 días:
      // ese criterio más estricto vive en Desarrollo › "Certificaciones con holgura".
      const vigentes = certificaciones.filter((c) =>
        esCertificacionVigente(c.fecha_vencimiento),
      ).length;
      return {
        plantilla: colaboradores.length,
        campo: colaboradores.filter((c) => c.ubicacion === "campo").length,
        antiguedad:
          colaboradores.length > 0
            ? colaboradores.reduce((a, c) => a + antiguedadAnios(c.fecha_ingreso), 0) / colaboradores.length
            : 0,
        certPct: certificaciones.length ? (vigentes / certificaciones.length) * 100 : 0,
        certTotal: certificaciones.length,
        certVigentes: vigentes,
        plantillaAutorizada: supuesto.data?.valor ?? null,
      };
    },
  });

  const autorizada = data?.plantillaAutorizada ?? null;

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          {cargando ? (
            <div className="space-y-2">
              <Skeleton className="h-7 w-52 rounded-none" />
              <Skeleton className="h-3 w-40 rounded-none" />
            </div>
          ) : (
            <>
              <h1 className="text-2xl text-grafito">Hola, {sesion?.nombre?.split(" ")[0]}</h1>
              <p className="mt-1 text-[13px] text-cota">
                {roles.map((r) => ETIQUETA_ROL[r]).join(" · ") ||
                  "Sin rol asignado. Pide acceso a Dirección de Talento."}
              </p>
            </>
          )}
        </div>
        <p className="cifra shrink-0 text-[11px] uppercase tracking-widest text-cota">Corte {hoy}</p>
      </header>

      <section aria-labelledby="ind" className="space-y-3">
        <h2 id="ind" className="text-[13px] font-semibold uppercase tracking-wide text-cota">
          Indicadores de plantilla
        </h2>
        {isLoading || !data ? (
          <EsqueletoIndicadores />
        ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {autorizada === null ? (
            <TarjetaNoCalculable
              titulo="Plantilla activa vs. autorizada"
              icono={Users}
              cifra={
                <>
                  {data.plantilla}
                  <span className="ml-1 text-base font-medium text-cota">personas activas</span>
                </>
              }
              razon="Falta la plantilla autorizada. No se asume línea base: captúrala en Configuración › Supuestos financieros."
              formula="Colaboradores con estatus activo ÷ plantilla autorizada"
              fuente="Tabla colaboradores · supuestos_financieros.plantilla_autorizada"
              fechaCorte={hoy}
            />
          ) : (
          <TarjetaIndicador
            titulo="Plantilla activa vs. autorizada"
            icono={Users}
            valor={data.plantilla}
            meta={autorizada}
            min={0}
            max={Math.max(autorizada, data.plantilla + 10)}
            unidad=" personas"
            decimales={0}
            sentido="mayorEsMejor"
            etiquetaMeta="Autorizada"
            formula="Colaboradores con estatus activo ÷ plantilla autorizada"
            fuente="Tabla colaboradores · supuestos_financieros.plantilla_autorizada"
            fechaCorte={hoy}
          />
          )}
          <TarjetaIndicador
            titulo="Antigüedad promedio"
            icono={CalendarClock}
            valor={data.antiguedad}
            meta={4}
            min={0}
            max={10}
            unidad=" años"
            decimales={1}
            sentido="mayorEsMejor"
            etiquetaMeta="Meta"
            formula="Promedio de (fecha de corte − fecha de ingreso) ÷ 365.25 de la plantilla activa"
            fuente="Tabla colaboradores"
            fechaCorte={hoy}
          />
          <TarjetaIndicador
            titulo="Certificaciones vigentes"
            icono={BadgeCheck}
            valor={data.certPct}
            meta={90}
            min={0}
            max={100}
            unidad="%"
            decimales={1}
            sentido="mayorEsMejor"
            etiquetaMeta="Meta"
            formula="Certificaciones con vencimiento ≥ fecha de corte ÷ total de certificaciones × 100"
            fuente={`Tabla certificaciones · criterio: vencimiento ≥ fecha de corte (${data.certVigentes} de ${data.certTotal} registros)`}
            fechaCorte={hoy}
          />
        </div>
        )}
      </section>

      <section className="rounded-2xl bg-card p-5 shadow-[var(--shadow-tarjeta)]">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-cota">
          <HardHat className="h-4 w-4 text-info" aria-hidden />
          Distribución
        </h2>
        {isLoading || !data ? (
          <Skeleton className="mt-2 h-4 w-56 rounded-none" />
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="cifra inline-flex items-center gap-1.5 rounded-full bg-info-suave px-3 py-1 text-[12px] font-semibold text-info">
              <HardHat className="h-3.5 w-3.5" aria-hidden />
              {data.campo} en campo
            </span>
            <span className="cifra inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-[12px] font-semibold text-grafito">
              <Award className="h-3.5 w-3.5" aria-hidden />
              {data.plantilla - data.campo} en corporativo
            </span>
          </div>
        )}
        <p className="mt-2 text-[13px] text-cota">
          Nexus administra el talento con la misma metodología con la que Escala administra proyectos: cada
          número trae fórmula, fuente y fecha de corte.
        </p>
      </section>
    </div>
  );
}