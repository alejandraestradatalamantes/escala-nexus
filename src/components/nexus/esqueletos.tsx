import { Skeleton } from "@/components/ui/skeleton";

/** Esqueletos que respetan el layout final; nunca mostramos ceros mientras se consulta. */

export function EsqueletoIndicadores({ cantidad = 3 }: { cantidad?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: cantidad }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 border border-border bg-card p-4">
          <Skeleton className="h-3 w-40 rounded-none" />
          <Skeleton className="h-8 w-28 rounded-none" />
          <Skeleton className="h-6 w-full rounded-none" />
          <div className="space-y-1 border-t border-border pt-2">
            <Skeleton className="h-2.5 w-full rounded-none" />
            <Skeleton className="h-2.5 w-3/4 rounded-none" />
            <Skeleton className="h-2.5 w-1/2 rounded-none" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EsqueletoTabla({ filas = 8, columnas = 6 }: { filas?: number; columnas?: number }) {
  return (
    <div className="border border-border bg-card">
      <div className="flex gap-3 bg-grafito px-3 py-2">
        {Array.from({ length: columnas }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1 rounded-none bg-cal/20" />
        ))}
      </div>
      {Array.from({ length: filas }).map((_, f) => (
        <div key={f} className="flex items-center gap-3 border-t border-border px-3 py-2.5">
          {Array.from({ length: columnas }).map((_, c) => (
            <Skeleton key={c} className="h-3 flex-1 rounded-none" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Pantalla completa mientras se resuelve la sesión y la ruta protegida. */
export function EsqueletoAplicacion() {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-sidebar lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <span className="h-5 w-1 bg-casco" aria-hidden />
          <span className="titulo text-base text-white">ESCALA</span>
          <span className="cifra text-sm text-cota">Nexus</span>
        </div>
        <div className="space-y-2 p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full rounded-none bg-white/10" />
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <div className="flex h-14 items-center gap-3 border-b border-border bg-card px-4">
          <Skeleton className="h-10 w-full max-w-96 rounded-none" />
        </div>
        <main className="min-w-0 flex-1 space-y-4 p-4 lg:p-6">
          <Skeleton className="h-8 w-56 rounded-none" />
          <EsqueletoIndicadores />
        </main>
      </div>
    </div>
  );
}
