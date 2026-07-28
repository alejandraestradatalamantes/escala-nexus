import { createFileRoute } from "@tanstack/react-router";
import { EnConstruccion } from "@/components/nexus/en-construccion";

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
  component: () => (
    <EnConstruccion
      modulo="Tiempo"
      descripcion="Solicitudes de vacaciones y permisos, saldos conforme a la LFT y calendario de obra por proyecto."
    />
  ),
});
