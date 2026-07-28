import { createFileRoute } from "@tanstack/react-router";
import { EnConstruccion } from "@/components/nexus/en-construccion";

export const Route = createFileRoute("/_authenticated/atraccion")({
  head: () => ({
    meta: [
      { title: "Atracción — ESCALA Nexus" },
      { name: "description", content: "Vacantes, candidatos, tablero de flujo y ofertas. Aquí vivirá el embudo de reclutamiento con tiempos de cobertura medidos contra su línea base." },
      { property: "og:title", content: "Atracción — ESCALA Nexus" },
      { property: "og:description", content: "Vacantes, candidatos, tablero de flujo y ofertas. Aquí vivirá el embudo de reclutamiento con tiempos de cobertura medidos contra su línea base." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <EnConstruccion
      modulo="Atracción"
      descripcion="Vacantes, candidatos, tablero de flujo y ofertas. Aquí vivirá el embudo de reclutamiento con tiempos de cobertura medidos contra su línea base."
    />
  ),
});
