import { createFileRoute } from "@tanstack/react-router";
import { EnConstruccion } from "@/components/nexus/en-construccion";

export const Route = createFileRoute("/_authenticated/desempeno")({
  head: () => ({
    meta: [
      { title: "Desempeño — ESCALA Nexus" },
      { name: "description", content: "Evaluaciones por competencias, objetivos por proyecto y calibración. Cada resultado se leerá como desviación contra la meta acordada." },
      { property: "og:title", content: "Desempeño — ESCALA Nexus" },
      { property: "og:description", content: "Evaluaciones por competencias, objetivos por proyecto y calibración. Cada resultado se leerá como desviación contra la meta acordada." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <EnConstruccion
      modulo="Desempeño"
      descripcion="Evaluaciones por competencias, objetivos por proyecto y calibración. Cada resultado se leerá como desviación contra la meta acordada."
    />
  ),
});
