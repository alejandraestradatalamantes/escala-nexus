import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SelectorBuscador } from "@/components/nexus/selector-buscador";
import { EsqueletoTabla } from "@/components/nexus/esqueletos";
import { fechaCorta, numero } from "@/lib/nexus/formato";
import { AVISO_ANONIMATO } from "@/lib/nexus/bienestar";
import { useEncuestas } from "./datos";

const TIPOS = [
  { valor: "gptw", etiqueta: "Clima (estilo GPTW)" },
  { valor: "pulso", etiqueta: "Pulso corto" },
  { valor: "salida", etiqueta: "Salida" },
];

interface Props {
  userId: string | null;
}

/** Administración de encuestas: avance en vivo, cuántas van, nunca quiénes. */
export function PanelEncuestas({ userId }: Props) {
  const qc = useQueryClient();
  const { data, isLoading } = useEncuestas();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("gptw");
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");
  const [objetivo, setObjetivo] = useState("80");

  const crear = useMutation({
    mutationFn: async () => {
      if (nombre.trim().length < 5) throw new Error("Ponle un nombre reconocible a la encuesta.");
      if (!inicio || !fin) throw new Error("Define el periodo de levantamiento.");
      if (fin < inicio) throw new Error("La fecha de cierre no puede ser anterior al inicio.");
      const { error } = await supabase.from("encuestas").insert({
        nombre: nombre.trim(),
        tipo,
        fecha_inicio: inicio,
        fecha_fin: fin,
        cobertura_objetivo: Number(objetivo) || null,
        estatus: "vigente",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Encuesta abierta.");
      setAbierto(false);
      setNombre("");
      qc.invalidateQueries({ queryKey: ["bienestar-encuestas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cerrar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("encuestas")
        .update({ estatus: "cerrada", cerrada_en: new Date().toISOString(), cerrada_por: userId })
        .eq("id", id);
      if (error) throw error;
      await supabase.from("bitacora_auditoria").insert({
        usuario_id: userId,
        accion: "Cierre de encuesta",
        tabla: "encuestas",
        registro_id: id,
        antes: { estatus: "vigente" } as never,
        despues: { estatus: "cerrada" } as never,
      });
    },
    onSuccess: () => {
      toast.success("Encuesta cerrada. Ya no admite respuestas.");
      qc.invalidateQueries({ queryKey: ["bienestar-encuestas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) return <EsqueletoTabla filas={4} columnas={6} />;

  const { encuestas, plantilla } = data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-[12px] text-cota">{AVISO_ANONIMATO}</p>
        <Dialog open={abierto} onOpenChange={setAbierto}>
          <DialogTrigger asChild>
            <Button className="rounded-none">Abrir encuesta</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg rounded-none">
            <DialogHeader>
              <DialogTitle className="text-base">Abrir encuesta</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="cifra text-[11px] uppercase tracking-wide text-cota">Nombre</Label>
                <Input
                  className="mt-1 rounded-none"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Clima y compromiso · segundo semestre"
                />
              </div>
              <div>
                <Label className="cifra text-[11px] uppercase tracking-wide text-cota">Tipo</Label>
                <SelectorBuscador
                  className="mt-1"
                  ariaLabel="Tipo de encuesta"
                  valor={tipo}
                  onCambio={setTipo}
                  opciones={TIPOS}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="cifra text-[11px] uppercase tracking-wide text-cota">
                    Inicio
                  </Label>
                  <Input
                    type="date"
                    className="mt-1 rounded-none"
                    value={inicio}
                    onChange={(e) => setInicio(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="cifra text-[11px] uppercase tracking-wide text-cota">
                    Cierre
                  </Label>
                  <Input
                    type="date"
                    className="mt-1 rounded-none"
                    value={fin}
                    onChange={(e) => setFin(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label className="cifra text-[11px] uppercase tracking-wide text-cota">
                  Cobertura objetivo (%)
                </Label>
                <Input
                  type="number"
                  className="mt-1 rounded-none"
                  value={objetivo}
                  onChange={(e) => setObjetivo(e.target.value)}
                />
              </div>
              <Button
                className="w-full rounded-none"
                disabled={crear.isPending}
                onClick={() => crear.mutate()}
              >
                Abrir encuesta
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto border border-border bg-card">
        <table className="w-full min-w-[52rem] text-[13px]">
          <thead>
            <tr className="bg-grafito text-left text-cal">
              <th className="px-3 py-2 font-semibold">Encuesta</th>
              <th className="px-3 py-2 font-semibold">Periodo</th>
              <th className="px-3 py-2 font-semibold">Estatus</th>
              <th className="px-3 py-2 text-right font-semibold">Respondientes</th>
              <th className="px-3 py-2 text-right font-semibold">Cobertura</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {encuestas.map((e) => {
              const cobertura = plantilla > 0 ? (e.avance / plantilla) * 100 : null;
              const objetivoPct = e.cobertura_objetivo ?? null;
              return (
                <tr key={e.id} className="border-t border-border hover:bg-muted/50">
                  <td className="px-3 py-2.5 text-grafito">{e.nombre}</td>
                  <td className="cifra px-3 py-2.5 text-cota">
                    {fechaCorta(e.fecha_inicio)} — {fechaCorta(e.fecha_fin)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={
                        e.estatus === "vigente"
                          ? "cifra border border-linea bg-linea/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-grafito"
                          : "cifra border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-cota"
                      }
                    >
                      {e.estatus}
                    </span>
                  </td>
                  <td className="cifra px-3 py-2.5 text-right text-grafito">
                    {e.avance} de {plantilla}
                  </td>
                  <td className="cifra px-3 py-2.5 text-right text-grafito">
                    {cobertura === null ? "—" : `${numero(cobertura, 1)}%`}
                    {objetivoPct ? (
                      <span className="text-cota"> / {numero(objetivoPct, 0)}%</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {e.estatus === "vigente" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-none"
                        disabled={cerrar.isPending}
                        onClick={() => cerrar.mutate(e.id)}
                      >
                        Cerrar
                      </Button>
                    ) : (
                      <span className="cifra text-[11px] text-cota">
                        {e.cerrada_en ? `Cerrada ${fechaCorta(e.cerrada_en)}` : "—"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-cota">
        El avance cuenta respondientes por identificador irreversible: el sistema sabe cuántas van,
        nunca quiénes. No hay forma de saber quién falta ni de reclamárselo.
      </p>
    </div>
  );
}