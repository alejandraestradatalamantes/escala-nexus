import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ESCALA Nexus — Talento administrado como proyecto" },
      {
        name: "description",
        content:
          "Nexus administra el talento de Escala con la misma metodología con la que Escala administra proyectos: línea base, desviación y valor ganado.",
      },
      { property: "og:title", content: "ESCALA Nexus" },
      {
        property: "og:description",
        content: "Talento administrado con línea base, desviación y valor ganado.",
      },
    ],
  }),
  component: Portada,
});

function Portada() {
  return (
    <div className="min-h-screen bg-grafito text-cal">
      <header className="flex items-center gap-2 border-b border-white/10 px-6 py-4">
        <span className="h-5 w-1 bg-casco" aria-hidden />
        <span className="titulo text-base">ESCALA</span>
        <span className="cifra text-sm text-cota">Nexus</span>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-20">
        <h1 className="text-4xl leading-tight sm:text-5xl">
          Talento administrado con el mismo rigor que una obra.
        </h1>
        <p className="max-w-xl text-base text-cota">
          Escala controla presupuesto, cronograma y valor ganado en cada proyecto. Nexus aplica esa
          misma metodología a las personas que ejecutan esos proyectos: línea base, desviación y
          fórmula visible en cada indicador.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/auth"
            className="inline-flex min-h-12 items-center bg-plomada px-6 text-sm font-semibold text-cal transition-colors duration-150 hover:bg-plomada/85"
          >
            Entrar a Nexus
          </Link>
        </div>
        <dl className="grid gap-px border border-white/10 bg-white/10 sm:grid-cols-3">
          {[
            ["11", "módulos navegables"],
            ["7", "roles con permisos granulares"],
            ["1", "banda de línea base en cada indicador"],
          ].map(([n, t]) => (
            <div key={t} className="bg-grafito p-5">
              <dt className="cifra text-3xl text-casco">{n}</dt>
              <dd className="mt-1 text-[13px] text-cota">{t}</dd>
            </div>
          ))}
        </dl>
      </main>
    </div>
  );
}
