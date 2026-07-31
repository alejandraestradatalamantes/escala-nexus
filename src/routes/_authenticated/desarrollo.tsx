import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IndicadoresDesarrollo } from "@/components/nexus/desarrollo/indicadores-desarrollo";
import { MiAgenda } from "@/components/nexus/desarrollo/mi-agenda";
import { AgendasEquipo } from "@/components/nexus/desarrollo/agendas-equipo";
import { PanelCertificaciones } from "@/components/nexus/desarrollo/panel-certificaciones";
import { useSesion } from "@/hooks/use-sesion";
import { fechaCorta } from "@/lib/nexus/formato";
import { CICLO_ACTUAL } from "@/lib/nexus/desarrollo";

interface Busqueda {
  colaborador?: string;
}

export const Route = createFileRoute("/_authenticated/desarrollo")({
  validateSearch: (search: Record<string, unknown>): Busqueda => ({
    colaborador: typeof search["colaborador"] === "string" ? search["colaborador"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Desarrollo — ESCALA Nexus" },
      {
        name: "description",
        content:
          "Planes de carrera, capacitación DC-3 y renovación de certificaciones patrocinadas por Escala.",
      },
      { property: "og:title", content: "Desarrollo — ESCALA Nexus" },
      {
        property: "og:description",
        content:
          "Planes de carrera, capacitación DC-3 y renovación de certificaciones patrocinadas por Escala.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Desarrollo,
});

function Desarrollo() {
  const { sesion, tiene } = useSesion();
  const navigate = useNavigate({ from: "/desarrollo" });
  const { colaborador } = Route.useSearch();
  const [pestana, setPestana] = useState(colaborador ? "agenda" : "agenda");

  const esTalento = tiene("direccion_talento");
  const veAgregado = tiene(
    "direccion_talento",
    "direccion_general",
    "lider_proyecto",
    "finanzas_auditoria",
  );
  const veEquipo = tiene("direccion_talento", "direccion_general", "lider_proyecto");
  const colaboradorVisto = colaborador ?? sesion?.colaboradorId ?? null;
  const viendoAOtro = !!colaborador && colaborador !== sesion?.colaboradorId;

  const abrirAgenda = (id: string) => {
    navigate({ search: { colaborador: id } });
    setPestana("agenda");
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl text-grafito">Desarrollo</h1>
          <p className="cifra mt-1 text-[12px] uppercase tracking-wide text-cota">
            Ciclo {CICLO_ACTUAL} · agenda de desarrollo · 70-20-10 · certificaciones
          </p>
        </div>
        <span className="cifra pt-1 text-[12px] text-cota">Corte {fechaCorta(new Date())}</span>
      </header>

      <p className="text-[13px] text-cota">
        Desempeño mide la brecha; Desarrollo la cierra. Aquí vive el plan que convierte una brecha
        de competencia en acciones con fecha, responsable y forma de medirlas.
      </p>

      {veAgregado ? <IndicadoresDesarrollo /> : null}

      <Tabs value={pestana} onValueChange={setPestana}>
        <TabsList className="rounded-none">
          <TabsTrigger value="agenda" className="rounded-none text-[13px]">
            {viendoAOtro ? "Agenda seleccionada" : "Mi agenda"}
          </TabsTrigger>
          {veEquipo ? (
            <TabsTrigger value="equipo" className="rounded-none text-[13px]">
              Agendas del equipo
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="certificaciones" className="rounded-none text-[13px]">
            Certificaciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agenda" className="mt-4 space-y-3">
          {viendoAOtro ? (
            <p className="flex flex-wrap items-center gap-2 border-l-2 border-casco bg-casco/10 px-3 py-2 text-[12px] text-grafito">
              Estás viendo la agenda de otra persona.
              <button type="button" onClick={() => navigate({ search: {} })} className="underline">
                Volver a mi agenda
              </button>
            </p>
          ) : null}
          <MiAgenda
            colaboradorId={colaboradorVisto}
            miColaboradorId={sesion?.colaboradorId ?? null}
            esTalento={esTalento}
          />
        </TabsContent>

        {veEquipo ? (
          <TabsContent value="equipo" className="mt-4">
            <AgendasEquipo onAbrir={abrirAgenda} />
          </TabsContent>
        ) : null}

        <TabsContent value="certificaciones" className="mt-4">
          <PanelCertificaciones esTalento={esTalento} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
