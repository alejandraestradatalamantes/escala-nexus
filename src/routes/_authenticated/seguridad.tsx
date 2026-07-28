import { createFileRoute } from "@tanstack/react-router";
import { EnConstruccion } from "@/components/nexus/en-construccion";

export const Route = createFileRoute("/_authenticated/seguridad")({
  head: () => ({
    meta: [
      { title: "Seguridad e Higiene — ESCALA Nexus" },
      { name: "description", content: "Incidentes, comisiones mixtas, capacitaciones obligatorias y días sin accidentes por frente de obra." },
      { property: "og:title", content: "Seguridad e Higiene — ESCALA Nexus" },
      { property: "og:description", content: "Incidentes, comisiones mixtas, capacitaciones obligatorias y días sin accidentes por frente de obra." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <EnConstruccion
      modulo="Seguridad e Higiene"
      descripcion="Incidentes, comisiones mixtas, capacitaciones obligatorias y días sin accidentes por frente de obra."
    />
  ),
});
