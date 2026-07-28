import { createFileRoute } from "@tanstack/react-router";
import { EnConstruccion } from "@/components/nexus/en-construccion";

export const Route = createFileRoute("/_authenticated/comunicacion")({
  head: () => ({
    meta: [
      { title: "Comunicación — ESCALA Nexus" },
      { name: "description", content: "Comunicados internos, acuses de lectura y avisos por proyecto para personal de campo." },
      { property: "og:title", content: "Comunicación — ESCALA Nexus" },
      { property: "og:description", content: "Comunicados internos, acuses de lectura y avisos por proyecto para personal de campo." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <EnConstruccion
      modulo="Comunicación"
      descripcion="Comunicados internos, acuses de lectura y avisos por proyecto para personal de campo."
    />
  ),
});
