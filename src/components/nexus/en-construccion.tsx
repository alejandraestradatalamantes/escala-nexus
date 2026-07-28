import { Ruler } from "lucide-react";

export function EnConstruccion({
  modulo,
  descripcion,
  fase = "Fase 2",
}: {
  modulo: string;
  descripcion: string;
  fase?: string;
}) {
  return (
    <div className="border border-dashed border-border bg-card p-8">
      <div className="flex items-start gap-4">
        <Ruler className="mt-1 h-5 w-5 shrink-0 text-cota" aria-hidden />
        <div className="min-w-0">
          <h1 className="text-xl text-grafito">{modulo}</h1>
          <p className="mt-2 max-w-2xl text-sm text-cota">{descripcion}</p>
          <span className="cifra mt-4 inline-block border border-casco px-2 py-1 text-[11px] uppercase tracking-wide text-casco">
            En construcción — {fase}
          </span>
        </div>
      </div>
    </div>
  );
}