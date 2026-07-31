import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { iniciales } from "@/lib/nexus/formato";
import { colorSla, diasDesde, MOTIVOS_DESCARTE } from "@/lib/nexus/atraccion";
import { cn } from "@/lib/utils";

export interface FaseFlujo {
  id: string;
  nombre: string;
  orden: number;
  sla_dias: number | null;
}

export interface CandidatoFlujo {
  id: string;
  nombre: string;
  fuente: string | null;
  fase_id: string | null;
  fecha_ingreso_fase: string | null;
  puesto: string;
}

interface Props {
  fases: FaseFlujo[];
  candidatos: CandidatoFlujo[];
  puedeMover: boolean;
  onMover: (candidato: CandidatoFlujo, faseDestino: FaseFlujo) => void;
  onDescartar: (candidato: CandidatoFlujo, motivo: string) => void;
}

export function TableroFlujo({ fases, candidatos, puedeMover, onMover, onDescartar }: Props) {
  const [descarte, setDescarte] = useState<CandidatoFlujo | null>(null);
  const [motivo, setMotivo] = useState<string>(MOTIVOS_DESCARTE[0]);

  return (
    <>
      <p className="cifra mb-2 flex items-center gap-1 text-[11px] uppercase tracking-wide text-cota lg:hidden">
        Desliza para ver las {fases.length} fases <span aria-hidden>→</span>
      </p>
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background to-transparent"
          aria-hidden
        />
      <div className="flex gap-2 overflow-x-auto pb-2">
        {fases.map((fase) => {
          const enFase = candidatos.filter((c) => c.fase_id === fase.id);
          return (
            <section key={fase.id} className="w-[236px] shrink-0 border border-border bg-card">
              <header className="border-b border-border bg-grafito px-3 py-2 text-cal">
                <h3 className="truncate text-[12px] font-semibold uppercase tracking-wide">{fase.nombre}</h3>
                <p className="cifra mt-0.5 text-[11px] text-cal/70">
                  {enFase.length} candidatos · SLA {fase.sla_dias ?? "—"} d
                </p>
              </header>
              <div className="space-y-2 p-2">
                {enFase.length === 0 ? (
                  <p className="border border-dashed border-border p-3 text-[12px] text-cota">
                    Sin candidatos en esta fase. Mueve alguno desde la fase anterior.
                  </p>
                ) : (
                  enFase.map((c) => {
                    const dias = diasDesde(c.fecha_ingreso_fase);
                    return (
                      <article
                        key={c.id}
                        className={cn(
                          "fila-tabla border border-border border-l-4 bg-card p-2.5",
                          colorSla(dias, fase.sla_dias),
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <span className="cifra grid h-7 w-7 shrink-0 place-items-center bg-plomada text-[10px] text-primary-foreground">
                            {iniciales(c.nombre)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium text-grafito">{c.nombre}</p>
                            <p className="truncate text-[11px] text-cota">{c.puesto}</p>
                            <p className="truncate text-[11px] text-cota">{c.fuente ?? "Fuente sin registrar"}</p>
                          </div>
                          {puedeMover && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-11 w-11 shrink-0 rounded-none sm:h-7 sm:w-7"
                                  aria-label={`Acciones para ${c.nombre}`}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-none">
                                <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-cota">
                                  Mover a…
                                </DropdownMenuLabel>
                                {fases
                                  .filter((f) => f.id !== fase.id)
                                  .map((f) => (
                                    <DropdownMenuItem key={f.id} onSelect={() => onMover(c, f)}>
                                      {f.nombre}
                                    </DropdownMenuItem>
                                  ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-desviacion"
                                  onSelect={() => {
                                    setMotivo(MOTIVOS_DESCARTE[0]);
                                    setDescarte(c);
                                  }}
                                >
                                  Descartar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        <p className="cifra mt-2 text-[11px] text-cota">
                          {dias ?? "—"} días en fase
                        </p>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>
      </div>

      <Dialog open={descarte !== null} onOpenChange={(v) => !v && setDescarte(null)}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>Descartar a {descarte?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="motivo_descarte">Motivo del descarte</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger id="motivo_descarte" className="h-10 rounded-none border-border text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                {MOTIVOS_DESCARTE.map((m) => (
                  <SelectItem key={m} value={m} className="rounded-none">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              className="h-10 rounded-none"
              onClick={() => {
                if (descarte) onDescartar(descarte, motivo);
                setDescarte(null);
              }}
            >
              Descartar candidato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}