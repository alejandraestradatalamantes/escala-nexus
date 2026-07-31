import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EsqueletoTabla } from "@/components/nexus/esqueletos";
import { fechaCorta } from "@/lib/nexus/formato";
import { cn } from "@/lib/utils";
import {
  AVISO_ANONIMATO,
  AVISO_PULSO,
  ESCALA_ANIMO,
  ETIQUETA_ACUERDO,
  REACTIVOS,
  etiquetaAnimo,
  haceDias,
  iso,
} from "@/lib/nexus/bienestar";
import { useEncuestas } from "./datos";

interface Props {
  colaboradorId: string | null;
}

export function MiBienestar({ colaboradorId }: Props) {
  const qc = useQueryClient();
  const hoy = iso(new Date());
  const [valor, setValor] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");

  const { data: pulsos, isLoading } = useQuery({
    queryKey: ["mis-pulsos", colaboradorId],
    enabled: !!colaboradorId,
    queryFn: async () => {
      const { data } = await supabase
        .from("pulsos_animo")
        .select("id, fecha, valor, comentario_opcional")
        .gte("fecha", iso(haceDias(120)))
        .order("fecha", { ascending: false });
      return data ?? [];
    },
  });

  const pulsoHoy = pulsos?.find((p) => p.fecha === hoy) ?? null;
  const serie = useMemo(
    () =>
      (pulsos ?? [])
        .slice()
        .reverse()
        .map((p) => ({ fecha: fechaCorta(p.fecha), valor: p.valor })),
    [pulsos],
  );

  const guardar = useMutation({
    mutationFn: async () => {
      if (!colaboradorId) throw new Error("Tu usuario no está vinculado a un expediente.");
      if (valor === null) throw new Error("Elige cómo te sientes hoy.");
      const { data: colab } = await supabase
        .from("colaboradores")
        .select("proyecto_actual_id")
        .eq("id", colaboradorId)
        .maybeSingle();
      const { error } = await supabase.from("pulsos_animo").upsert(
        {
          colaborador_id: colaboradorId,
          fecha: hoy,
          valor,
          comentario_opcional: comentario.trim() || null,
          proyecto_id: colab?.proyecto_actual_id ?? null,
        },
        { onConflict: "colaborador_id,fecha" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pulso registrado. Solo tú lo ves.");
      setComentario("");
      setValor(null);
      qc.invalidateQueries({ queryKey: ["mis-pulsos"] });
      qc.invalidateQueries({ queryKey: ["animo-firma"] });
      qc.invalidateQueries({ queryKey: ["animo-equipo"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <section className="border border-border bg-card p-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-cota">
          ¿Cómo te fue hoy?
        </h2>
        <p className="mt-1 text-[12px] text-cota">{AVISO_PULSO}</p>
        {pulsoHoy ? (
          <p className="cifra mt-3 border-l-2 border-linea bg-linea/10 px-2 py-1.5 text-[12px] text-grafito">
            Ya registraste hoy: {etiquetaAnimo(pulsoHoy.valor)}. Puedes corregirlo eligiendo otra
            opción.
          </p>
        ) : null}
        <div className="mt-3 grid grid-cols-5 gap-2">
          {ESCALA_ANIMO.map((o) => (
            <button
              key={o.valor}
              type="button"
              onClick={() => setValor(o.valor)}
              aria-pressed={valor === o.valor}
              className={cn(
                "flex min-h-16 flex-col items-center justify-center gap-1 border px-1 py-2 text-center transition-colors",
                valor === o.valor
                  ? "border-grafito bg-grafito text-cal"
                  : "border-border bg-background text-grafito hover:border-grafito",
              )}
            >
              <span className="cifra text-lg leading-none">{o.valor}</span>
              <span className="text-[10px] leading-tight">{o.etiqueta}</span>
            </button>
          ))}
        </div>
        <Textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Comentario opcional. Confidencial: tu líder nunca lo ve."
          className="mt-3 min-h-20 rounded-none"
        />
        <Button
          className="mt-3 rounded-none"
          disabled={valor === null || guardar.isPending || !colaboradorId}
          onClick={() => guardar.mutate()}
        >
          {pulsoHoy ? "Actualizar mi pulso" : "Registrar mi pulso"}
        </Button>
        {!colaboradorId ? (
          <p className="mt-2 text-[11px] text-desviacion">
            Tu usuario no está vinculado a un expediente. Pídelo en Configuración › Usuarios y
            accesos.
          </p>
        ) : null}
      </section>

      <EncuestaVigente />

      <section className="border border-border bg-card p-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-cota">
          Mi histórico
        </h2>
        <p className="mt-1 text-[12px] text-cota">
          Últimos 120 días. Este histórico es tuyo y de nadie más.
        </p>
        {isLoading ? (
          <div className="mt-3">
            <EsqueletoTabla filas={4} columnas={3} />
          </div>
        ) : serie.length === 0 ? (
          <p className="mt-3 text-[13px] text-cota">Todavía no registras ningún pulso.</p>
        ) : (
          <>
            <div className="mt-3 h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={serie} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
                  <CartesianGrid strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="fecha" tick={{ fontSize: 10 }} tickLine={false} />
                  <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10 }} tickLine={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="valor"
                    stroke="currentColor"
                    className="text-linea"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-3 divide-y divide-border border-t border-border">
              {(pulsos ?? []).slice(0, 12).map((p) => (
                <li key={p.id} className="flex flex-wrap items-baseline gap-2 py-2 text-[13px]">
                  <span className="cifra w-28 shrink-0 text-cota">{fechaCorta(p.fecha)}</span>
                  <span className="w-36 shrink-0 text-grafito">{etiquetaAnimo(p.valor)}</span>
                  <span className="min-w-0 flex-1 text-cota">{p.comentario_opcional ?? "—"}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <p className="text-[11px] text-cota">{AVISO_ANONIMATO}</p>
    </div>
  );
}

function EncuestaVigente() {
  const qc = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const [respuestas, setRespuestas] = useState<Record<string, number>>({});
  const { data } = useEncuestas();
  const vigente = data?.encuestas.find((e) => e.estatus === "vigente") ?? null;

  const { data: yaRespondi } = useQuery({
    queryKey: ["ya-respondi", vigente?.id],
    enabled: !!vigente,
    queryFn: async () => {
      const { data: r } = await supabase.rpc("ya_respondi", { _encuesta: vigente!.id });
      return r === true;
    },
  });

  const enviar = useMutation({
    mutationFn: async () => {
      if (!vigente) throw new Error("No hay encuesta vigente.");
      const faltan = REACTIVOS.filter((r) => respuestas[r.clave] === undefined);
      if (faltan.length > 0) throw new Error("Contesta todos los reactivos antes de enviar.");
      const { error } = await supabase.rpc("responder_encuesta", {
        _encuesta: vigente.id,
        _respuestas: respuestas,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Respuesta enviada de forma anónima. Gracias.");
      setAbierto(false);
      setRespuestas({});
      qc.invalidateQueries({ queryKey: ["ya-respondi"] });
      qc.invalidateQueries({ queryKey: ["bienestar-encuestas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!vigente) return null;

  return (
    <section className="border border-border bg-card p-4">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-cota">
        Encuesta vigente
      </h2>
      <p className="mt-1 text-[13px] text-grafito">{vigente.nombre}</p>
      <p className="cifra text-[11px] text-cota">
        Abierta del {fechaCorta(vigente.fecha_inicio)} al {fechaCorta(vigente.fecha_fin)}
      </p>
      <p className="mt-2 text-[11px] text-cota">{AVISO_ANONIMATO}</p>
      {yaRespondi ? (
        <p className="cifra mt-3 border-l-2 border-linea bg-linea/10 px-2 py-1.5 text-[12px] text-grafito">
          Ya contestaste esta encuesta. Puedes volver a contestarla y tu respuesta anterior se
          reemplaza; el sistema sabe que ya participaste, no qué contestaste.
        </p>
      ) : null}
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogTrigger asChild>
          <Button variant={yaRespondi ? "outline" : "default"} className="mt-3 rounded-none">
            {yaRespondi ? "Volver a contestar" : "Contestar la encuesta"}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto rounded-none">
          <DialogHeader>
            <DialogTitle className="text-base">{vigente.nombre}</DialogTitle>
          </DialogHeader>
          <p className="text-[12px] text-cota">{AVISO_ANONIMATO}</p>
          <div className="space-y-5">
            {REACTIVOS.map((r) => (
              <fieldset key={r.clave}>
                <legend className="text-[13px] text-grafito">{r.texto}</legend>
                <p className="cifra text-[10px] uppercase tracking-wide text-cota">{r.dimension}</p>
                <div
                  className={cn(
                    "mt-2 grid gap-1.5",
                    r.escala === "enps" ? "grid-cols-6 sm:grid-cols-11" : "grid-cols-5",
                  )}
                >
                  {(r.escala === "enps"
                    ? Array.from({ length: 11 }, (_, i) => i)
                    : [1, 2, 3, 4, 5]
                  ).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setRespuestas((prev) => ({ ...prev, [r.clave]: v }))}
                      aria-pressed={respuestas[r.clave] === v}
                      title={r.escala === "acuerdo" ? ETIQUETA_ACUERDO[v] : `${v} de 10`}
                      className={cn(
                        "cifra min-h-10 border px-1 py-2 text-[13px] transition-colors",
                        respuestas[r.clave] === v
                          ? "border-grafito bg-grafito text-cal"
                          : "border-border bg-background text-grafito hover:border-grafito",
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                {r.escala === "acuerdo" ? (
                  <p className="mt-1 text-[10px] text-cota">
                    1 nada de acuerdo · 5 totalmente de acuerdo
                  </p>
                ) : (
                  <p className="mt-1 text-[10px] text-cota">0 nada probable · 10 muy probable</p>
                )}
              </fieldset>
            ))}
          </div>
          <Button
            className="rounded-none"
            disabled={enviar.isPending}
            onClick={() => enviar.mutate()}
          >
            Enviar de forma anónima
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}