import { createFileRoute } from "@tanstack/react-router";
import { EnConstruccion } from "@/components/nexus/en-construccion";

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
  component: () => (
    <EnConstruccion
      modulo="Bienestar"
      descripcion="Pulsos de clima, reconocimientos entre pares y señales tempranas de rotación."
    />
  ),
});
