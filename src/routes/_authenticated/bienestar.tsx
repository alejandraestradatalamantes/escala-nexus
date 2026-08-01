import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IndicadoresBienestar } from "@/components/nexus/bienestar/indicadores-bienestar";
import { MiBienestar } from "@/components/nexus/bienestar/mi-bienestar";
import { MuroReconocimientos } from "@/components/nexus/bienestar/muro-reconocimientos";
import { Clima } from "@/components/nexus/bienestar/clima";
import { PanelEncuestas } from "@/components/nexus/bienestar/panel-encuestas";
import { ComentariosAnimo } from "@/components/nexus/bienestar/comentarios-animo";
import { BannerAviso } from "@/components/nexus/banner-aviso";
import { HeartPulse } from "lucide-react";
import { useSesion } from "@/hooks/use-sesion";
import { fechaCorta } from "@/lib/nexus/formato";
import { MINIMO_AGREGACION } from "@/lib/nexus/bienestar";

export const Route = createFileRoute("/_authenticated/bienestar")({
  head: () => ({
    meta: [
      { title: "Bienestar — ESCALA Nexus" },
      { name: "description", content: "Pulsos de clima, reconocimientos entre pares y señales tempranas de rotación." },
      { property: "og:title", content: "Bienestar — ESCALA Nexus" },
      { property: "og:description", content: "Pulsos de clima, reconocimientos entre pares y señales tempranas de rotación." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Bienestar,
});

function Bienestar() {
  const { sesion, tiene } = useSesion();
  const [pestana, setPestana] = useState("mi-bienestar");

  const esTalento = tiene("direccion_talento");
  const veAgregadoFirma = tiene("direccion_talento", "direccion_general");
  const esLider = tiene("lider_proyecto");

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-riesgo-suave text-riesgo"
            aria-hidden
          >
            <HeartPulse className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl text-grafito">Bienestar</h1>
            <p className="cifra mt-1 text-[12px] uppercase tracking-wide text-cota">
              Pulso de ánimo · reconocimientos · clima · encuestas anónimas
            </p>
          </div>
        </div>
        <span className="cifra pt-1 text-[12px] text-cota">Corte {fechaCorta(new Date())}</span>
      </header>

      <BannerAviso tono="confidencial" titulo="Cómo se mide aquí">
        Medir el ánimo de la gente solo sirve si la gente confía en cómo se mide. Aquí nadie ve el
        pulso ni la respuesta de una persona identificable: todo se despliega agregado y con un
        mínimo de {MINIMO_AGREGACION} personas por corte.
      </BannerAviso>

      {veAgregadoFirma || esLider ? (
        <IndicadoresBienestar veAgregadoFirma={veAgregadoFirma} esLider={esLider} />
      ) : null}

      <Tabs value={pestana} onValueChange={setPestana}>
        <TabsList className="rounded-none">
          <TabsTrigger value="mi-bienestar" className="rounded-none text-[13px]">
            Mi bienestar
          </TabsTrigger>
          <TabsTrigger value="reconocimientos" className="rounded-none text-[13px]">
            Reconocimientos
          </TabsTrigger>
          {veAgregadoFirma ? (
            <TabsTrigger value="clima" className="rounded-none text-[13px]">
              Clima
            </TabsTrigger>
          ) : null}
          {veAgregadoFirma ? (
            <TabsTrigger value="encuestas" className="rounded-none text-[13px]">
              Encuestas
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="mi-bienestar" className="mt-4">
          <MiBienestar colaboradorId={sesion?.colaboradorId ?? null} />
        </TabsContent>

        <TabsContent value="reconocimientos" className="mt-4">
          <MuroReconocimientos colaboradorId={sesion?.colaboradorId ?? null} />
        </TabsContent>

        {veAgregadoFirma ? (
          <TabsContent value="clima" className="mt-4 space-y-5">
            <Clima />
            {esTalento ? <ComentariosAnimo /> : null}
          </TabsContent>
        ) : null}

        {veAgregadoFirma ? (
          <TabsContent value="encuestas" className="mt-4">
            <PanelEncuestas userId={sesion?.userId ?? null} />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
