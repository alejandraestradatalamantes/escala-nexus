import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IndicadoresTiempo } from "@/components/nexus/tiempo/indicadores-tiempo";
import { MisSolicitudes } from "@/components/nexus/tiempo/mis-solicitudes";
import { PorAprobar } from "@/components/nexus/tiempo/por-aprobar";
import { Cobertura } from "@/components/nexus/tiempo/cobertura";
import { RegistroJornada } from "@/components/nexus/tiempo/registro-jornada";
import { useSesion } from "@/hooks/use-sesion";
import { fechaCorta } from "@/lib/nexus/formato";

export const Route = createFileRoute("/_authenticated/tiempo")({
  head: () => ({
    meta: [
      { title: "Tiempo — ESCALA Nexus" },
      { name: "description", content: "Solicitudes de vacaciones y permisos, saldos conforme a la LFT y calendario de obra por proyecto." },
      { property: "og:title", content: "Tiempo — ESCALA Nexus" },
      { property: "og:description", content: "Solicitudes de vacaciones y permisos, saldos conforme a la LFT y calendario de obra por proyecto." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Tiempo,
});

function Tiempo() {
  const { sesion, tiene } = useSesion();
  const [pestana, setPestana] = useState("mis-solicitudes");

  const esTalento = tiene("direccion_talento");
  const veAgregado = tiene(
    "direccion_talento",
    "direccion_general",
    "lider_proyecto",
    "finanzas_auditoria",
  );
  const apruebaOTal = tiene("direccion_talento", "lider_proyecto", "direccion_general");
  const veUbicacion = tiene("direccion_talento", "lider_proyecto") || true;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl text-grafito">Tiempo</h1>
          <p className="cifra mt-1 text-[12px] uppercase tracking-wide text-cota">
            Artículo 76 LFT · saldos · autorizaciones · cobertura de obra
          </p>
        </div>
        <span className="cifra pt-1 text-[12px] text-cota">Corte {fechaCorta(new Date())}</span>
      </header>

      <p className="text-[13px] text-cota">
        El tiempo de descanso es un derecho, no una concesión. Los días de ley salen del catálogo del
        artículo 76 que Dirección de Talento mantiene en Configuración, nunca de una tabla escrita en
        el código.
      </p>

      {veAgregado ? <IndicadoresTiempo /> : null}

      <Tabs value={pestana} onValueChange={setPestana}>
        <TabsList className="rounded-none">
          <TabsTrigger value="mis-solicitudes" className="rounded-none text-[13px]">
            Mis solicitudes
          </TabsTrigger>
          {apruebaOTal ? (
            <TabsTrigger value="por-aprobar" className="rounded-none text-[13px]">
              Por aprobar
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="cobertura" className="rounded-none text-[13px]">
            Cobertura
          </TabsTrigger>
          <TabsTrigger value="jornada" className="rounded-none text-[13px]">
            Registro de jornada
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mis-solicitudes" className="mt-4">
          <MisSolicitudes colaboradorId={sesion?.colaboradorId ?? null} esTalento={esTalento} />
        </TabsContent>

        {apruebaOTal ? (
          <TabsContent value="por-aprobar" className="mt-4">
            <PorAprobar miColaboradorId={sesion?.colaboradorId ?? null} />
          </TabsContent>
        ) : null}

        <TabsContent value="cobertura" className="mt-4">
          <Cobertura />
        </TabsContent>

        <TabsContent value="jornada" className="mt-4">
          <RegistroJornada
            colaboradorId={sesion?.colaboradorId ?? null}
            puedeVerUbicacion={veUbicacion}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
