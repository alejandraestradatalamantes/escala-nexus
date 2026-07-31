import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fechaCorta } from "@/lib/nexus/formato";

interface Props {
  evaluacionId: string | null;
  nombreEvaluado: string;
  onOpenChange: (abierto: boolean) => void;
}

/**
 * Guía de conversación Situación–Comportamiento–Impacto compuesta con las
 * evidencias ya capturadas. Sin IA: es composición de datos.
 */
export function GuiaSbi({ evaluacionId, nombreEvaluado, onOpenChange }: Props) {
  const [notas, setNotas] = useState<Record<string, { comportamiento: string; impacto: string }>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["guia-sbi", evaluacionId],
    enabled: !!evaluacionId,
    queryFn: async () => {
      const [respuestas, competencias] = await Promise.all([
        supabase
          .from("evaluacion_competencias")
          .select("competencia_id, nivel_observado, evidencia")
          .eq("evaluacion_id", evaluacionId as string),
        supabase.from("competencias").select("id, nombre, grupo, orden").order("orden"),
      ]);
      return { respuestas: respuestas.data ?? [], competencias: competencias.data ?? [] };
    },
  });

  const secciones = useMemo(() => {
    const comps = data?.competencias ?? [];
    return comps.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      grupo: c.grupo,
      respuesta: (data?.respuestas ?? []).find((r) => r.competencia_id === c.id) ?? null,
    }));
  }, [data]);

  const descargar = () => {
    const lineas = [
      `Guía de conversación SBI — ${nombreEvaluado}`,
      `Fecha ${fechaCorta(new Date())}`,
      "",
      ...secciones.flatMap((s) => [
        `${s.grupo ?? ""} · ${s.nombre} (nivel observado ${s.respuesta?.nivel_observado ?? "—"})`,
        `Situación: ${s.respuesta?.evidencia ?? "Sin evidencia capturada."}`,
        `Comportamiento: ${notas[s.id]?.comportamiento ?? ""}`,
        `Impacto: ${notas[s.id]?.impacto ?? ""}`,
        "",
      ]),
    ];
    const blob = new Blob([lineas.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guia-sbi-${nombreEvaluado.toLowerCase().replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={!!evaluacionId} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-none">
        <DialogHeader>
          <DialogTitle>Guía de conversación SBI — {nombreEvaluado}</DialogTitle>
        </DialogHeader>
        <p className="text-[13px] text-cota">
          Armada con las evidencias capturadas. La situación viene de la evidencia; el comportamiento y
          el impacto los escribe el líder antes de la sesión.
        </p>
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-none" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {secciones.map((s) => (
              <section key={s.id} className="border border-border bg-card p-3">
                <header className="flex items-baseline justify-between gap-2">
                  <h3 className="text-[13px] font-semibold text-grafito">{s.nombre}</h3>
                  <span className="cifra text-[11px] uppercase tracking-wide text-cota">
                    Nivel observado {s.respuesta?.nivel_observado ?? "—"}
                  </span>
                </header>
                <p className="mt-2 border-l-2 border-grafito bg-cota/5 px-3 py-2 text-[13px] leading-snug text-grafito">
                  <span className="cifra mr-1 text-[11px] uppercase tracking-wide text-cota">
                    Situación
                  </span>
                  {s.respuesta?.evidencia ?? "Sin evidencia capturada en esta competencia."}
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label
                      htmlFor={`comp-${s.id}`}
                      className="cifra text-[11px] uppercase tracking-wide text-cota"
                    >
                      Comportamiento
                    </label>
                    <Textarea
                      id={`comp-${s.id}`}
                      rows={3}
                      value={notas[s.id]?.comportamiento ?? ""}
                      onChange={(e) =>
                        setNotas((n) => ({
                          ...n,
                          [s.id]: {
                            comportamiento: e.target.value,
                            impacto: n[s.id]?.impacto ?? "",
                          },
                        }))
                      }
                      className="rounded-none text-[13px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor={`imp-${s.id}`}
                      className="cifra text-[11px] uppercase tracking-wide text-cota"
                    >
                      Impacto
                    </label>
                    <Textarea
                      id={`imp-${s.id}`}
                      rows={3}
                      value={notas[s.id]?.impacto ?? ""}
                      onChange={(e) =>
                        setNotas((n) => ({
                          ...n,
                          [s.id]: {
                            comportamiento: n[s.id]?.comportamiento ?? "",
                            impacto: e.target.value,
                          },
                        }))
                      }
                      className="rounded-none text-[13px]"
                    />
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button onClick={descargar} className="h-10 rounded-none">
            <Download className="mr-1 h-4 w-4" /> Descargar guía
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="h-10 rounded-none">
            <Printer className="mr-1 h-4 w-4" /> Imprimir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}