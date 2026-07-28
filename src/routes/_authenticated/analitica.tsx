import { createFileRoute } from "@tanstack/react-router";
import { EnConstruccion } from "@/components/nexus/en-construccion";

export const Route = createFileRoute("/_authenticated/analitica")({
  head: () => ({
    meta: [
      { title: "Analítica — ESCALA Nexus" },
      { name: "description", content: "Reportes ejecutivos, costo de plantilla y proyecciones. Todo indicador con fórmula, fuente y fecha de corte visibles." },
      { property: "og:title", content: "Analítica — ESCALA Nexus" },
      { property: "og:description", content: "Reportes ejecutivos, costo de plantilla y proyecciones. Todo indicador con fórmula, fuente y fecha de corte visibles." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <EnConstruccion
      modulo="Analítica"
      descripcion="Reportes ejecutivos, costo de plantilla y proyecciones. Todo indicador con fórmula, fuente y fecha de corte visibles."
    />
  ),
});
