import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Esqueletos que respetan el layout final; nunca mostramos ceros mientras se consulta. */

export function EsqueletoIndicadores({ cantidad = 3 }: { cantidad?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: cantidad }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-[var(--shadow-tarjeta)]"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-3 w-40 rounded-full" />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-10 w-32 rounded-lg" />
              <Skeleton className="h-4 w-24 rounded-full" />
            </div>
            <Skeleton className="h-[68px] w-[68px] rounded-full" />
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

/** Envuelve contenido ya cargado con un fundido breve (B5). */
export function Fundido({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("aparece", className)}>{children}</div>;
}
