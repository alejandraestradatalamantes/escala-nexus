import { createFileRoute } from "@tanstack/react-router";
import { EnConstruccion } from "@/components/nexus/en-construccion";

export const Route = createFileRoute("/_authenticated/desarrollo")({
  head: () => ({
    meta: [
      { title: "Desarrollo — ESCALA Nexus" },
      { name: "description", content: "Planes de carrera, capacitación DC-3 y renovación de certificaciones patrocinadas por Escala." },
      { property: "og:title", content: "Desarrollo — ESCALA Nexus" },
      { property: "og:description", content: "Planes de carrera, capacitación DC-3 y renovación de certificaciones patrocinadas por Escala." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <EnConstruccion
      modulo="Desarrollo"
      descripcion="Planes de carrera, capacitación DC-3 y renovación de certificaciones patrocinadas por Escala."
    />
  ),
});
