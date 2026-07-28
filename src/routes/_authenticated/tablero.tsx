import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TarjetaIndicador } from "@/components/nexus/tarjeta-indicador";
import { useSesion } from "@/hooks/use-sesion";
import { antiguedadAnios, ETIQUETA_ROL, fechaCorta } from "@/lib/nexus/formato";

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
  const { sesion, roles } = useSesion();
  const hoy = fechaCorta(new Date());

  const { data } = useQuery({
    queryKey: ["tablero-indicadores"],
    queryFn: async () => {
      const [cols, certs, supuesto] = await Promise.all([
        supabase.from("colaboradores").select("id, fecha_ingreso, ubicacion").eq("estatus", "activo"),
        supabase.from("certificaciones").select("id, fecha_vencimiento"),
        supabase.from("supuestos_financieros").select("valor").eq("clave", "plantilla_autorizada").maybeSingle(),
      ]);
      const colaboradores = cols.data ?? [];
      const certificaciones = certs.data ?? [];
      const vigentes = certificaciones.filter(
        (c) => c.fecha_vencimiento && new Date(c.fecha_vencimiento) >= new Date(),
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
        plantillaAutorizada: supuesto.data?.valor ?? null,
      };
    },
  });

  const autorizada = data?.plantillaAutorizada ?? null;

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl text-grafito">Hola, {sesion?.nombre?.split(" ")[0]}</h1>
          <p className="mt-1 text-[13px] text-cota">
            {roles.map((r) => ETIQUETA_ROL[r]).join(" · ") || "Sin rol asignado. Pide acceso a Dirección de Talento."}
          </p>
        </div>
        <p className="cifra shrink-0 text-[11px] uppercase tracking-widest text-cota">Corte {hoy}</p>
      </header>

      <section aria-labelledby="ind" className="space-y-3">
        <h2 id="ind" className="text-[13px] font-semibold uppercase tracking-wide text-cota">
          Indicadores de plantilla
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <TarjetaIndicador
            titulo="Plantilla activa vs. autorizada"
            valor={data?.plantilla ?? 0}
            meta={autorizada ?? data?.plantilla ?? 0}
            min={0}
            max={Math.max(autorizada ?? 0, (data?.plantilla ?? 0) + 10)}
            unidad=" personas"
            decimales={0}
            sentido="mayorEsMejor"
            etiquetaMeta="Autorizada"
            formula="Colaboradores con estatus activo ÷ plantilla autorizada"
            fuente="Tabla colaboradores · supuestos_financieros.plantilla_autorizada"
            fechaCorte={hoy}
            nota={
              autorizada === null ? (
                <p className="cifra border-l-2 border-casco bg-casco/10 px-2 py-1.5 text-[11px] text-grafito">
                  Plantilla autorizada: [Dato Requerido de Escala] — captúralo en Configuración › Supuestos.
                </p>
              ) : undefined
            }
          />
          <TarjetaIndicador
            titulo="Antigüedad promedio"
            valor={data?.antiguedad ?? 0}
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
            valor={data?.certPct ?? 0}
            meta={90}
            min={0}
            max={100}
            unidad="%"
            decimales={1}
            sentido="mayorEsMejor"
            etiquetaMeta="Meta"
            formula="Certificaciones con vencimiento ≥ fecha de corte ÷ total de certificaciones × 100"
            fuente={`Tabla certificaciones (${data?.certTotal ?? 0} registros)`}
            fechaCorte={hoy}
          />
        </div>
      </section>

      <section className="border border-border bg-card p-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-cota">Distribución</h2>
        <p className="cifra mt-2 text-sm text-grafito">
          {data?.campo ?? 0} en campo · {(data?.plantilla ?? 0) - (data?.campo ?? 0)} en corporativo
        </p>
        <p className="mt-2 text-[13px] text-cota">
          Nexus administra el talento con la misma metodología con la que Escala administra proyectos: cada
          número trae fórmula, fuente y fecha de corte.
        </p>
      </section>
    </div>
  );
}