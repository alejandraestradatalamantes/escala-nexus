import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardList, HeartPulse, LineChart as LineChartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EsqueletoTabla } from "@/components/nexus/esqueletos";
import { BannerAviso } from "@/components/nexus/banner-aviso";
import { fechaCorta } from "@/lib/nexus/formato";
import { cn } from "@/lib/utils";
import {
  avisoAnonimato,
  avisoPulso,
  ESCALA_ANIMO,
  ETIQUETA_ACUERDO,
  REACTIVOS,
  etiquetaAnimo,
  haceDias,
  iso,
} from "@/lib/nexus/bienestar";
import { useUmbralAgregacion } from "@/hooks/use-umbral";
import { useEncuestas } from "./datos";

interface Props {
  colaboradorId: string | null;
}

const PULSO: Record<number, { emoji: string; activo: string; pasivo: string }> = {
  1: {
    emoji: "😞",
    activo: "bg-riesgo text-white shadow-[var(--shadow-tarjeta-alta)]",
    pasivo: "bg-riesgo-suave text-riesgo hover:bg-riesgo/15",
  },
  2: {
    emoji: "😕",
    activo: "bg-alerta text-grafito shadow-[var(--shadow-tarjeta-alta)]",
    pasivo: "bg-alerta-suave text-alerta hover:bg-alerta/15",
  },
  3: {
    emoji: "😐",
    activo: "bg-cota text-white shadow-[var(--shadow-tarjeta-alta)]",
    pasivo: "bg-muted text-cota hover:bg-cota/15",
  },
  4: {
    emoji: "🙂",
    activo: "bg-exito/80 text-white shadow-[var(--shadow-tarjeta-alta)]",
    pasivo: "bg-exito-suave text-exito hover:bg-exito/15",
  },
  5: {
    emoji: "😄",
    activo: "bg-exito text-white shadow-[var(--shadow-tarjeta-alta)]",
    pasivo: "bg-exito-suave text-exito hover:bg-exito/15",
  },
};

export function MiBienestar({ colaboradorId }: Props) {
  const qc = useQueryClient();
  const { umbral } = useUmbralAgregacion();
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
      <section className="rounded-2xl bg-card p-5 shadow-[var(--shadow-tarjeta)]">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-grafito">
          <span
            className="grid h-8 w-8 place-items-center rounded-xl bg-riesgo-suave text-riesgo"
            aria-hidden
          >
            <HeartPulse className="h-4 w-4" />
          </span>
          ¿Cómo te fue hoy?
        </h2>
        <BannerAviso tono="confidencial" titulo="Solo tú lo ves" className="mt-3">
          {avisoPulso(umbral)}
        </BannerAviso>
        {pulsoHoy ? (
          <BannerAviso tono="exito" className="mt-2">
            Ya registraste hoy: {etiquetaAnimo(pulsoHoy.valor)}. Puedes corregirlo eligiendo otra
            opción.
          </BannerAviso>
        ) : null}
        <div className="mt-4 grid grid-cols-5 gap-2">
          {ESCALA_ANIMO.map((o) => {
            const t = PULSO[o.valor];
            const activo = valor === o.valor;
            return (
              <button
                key={o.valor}
                type="button"
                onClick={() => setValor(o.valor)}
                aria-pressed={activo}
                aria-label={o.etiqueta}
                className={cn(
                  "flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-2xl px-1 py-3 text-center transition-all duration-150",
                  activo ? cn(t.activo, "scale-[1.03]") : t.pasivo,
                )}
              >
                <span className="text-2xl leading-none" aria-hidden>
                  {t.emoji}
                </span>
                <span className="text-[10px] font-semibold leading-tight">{o.etiqueta}</span>
              </button>
            );
          })}
        </div>
        <Textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Comentario opcional. Confidencial: tu líder nunca lo ve."
          className="mt-3 min-h-20 rounded-xl"
        />
        <Button
          className="mt-3 rounded-xl"
          disabled={valor === null || guardar.isPending || !colaboradorId}
          onClick={() => guardar.mutate()}
        >
          {pulsoHoy ? "Actualizar mi pulso" : "Registrar mi pulso"}
        </Button>
        {!colaboradorId ? (
          <BannerAviso tono="riesgo" titulo="Sin expediente vinculado" className="mt-3">
            Tu usuario no está vinculado a un expediente. Pídelo en Configuración › Usuarios y
            accesos.
          </BannerAviso>
        ) : null}
      </section>

      <EncuestaVigente />

      <section className="rounded-2xl bg-card p-5 shadow-[var(--shadow-tarjeta)]">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-grafito">
          <span
            className="grid h-8 w-8 place-items-center rounded-xl bg-info-suave text-info"
            aria-hidden
          >
            <LineChartIcon className="h-4 w-4" />
          </span>
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
                  <YAxis
                    domain={[1, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                  />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="valor"
                    stroke="var(--color-info)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "var(--color-info)" }}
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

      <BannerAviso tono="confidencial" ojoTachado titulo="Anonimato de encuestas">
        {avisoAnonimato(umbral)}
      </BannerAviso>
    </div>
  );
}

function EncuestaVigente() {
  const qc = useQueryClient();
  const { umbral } = useUmbralAgregacion();
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
    <section className="rounded-2xl bg-card p-5 shadow-[var(--shadow-tarjeta)]">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-grafito">
        <span
          className="grid h-8 w-8 place-items-center rounded-xl bg-alerta-suave text-alerta"
          aria-hidden
        >
          <ClipboardList className="h-4 w-4" />
        </span>
        Encuesta vigente
      </h2>
      <p className="mt-2 text-[13px] text-grafito">{vigente.nombre}</p>
      <p className="cifra text-[11px] text-cota">
        Abierta del {fechaCorta(vigente.fecha_inicio)} al {fechaCorta(vigente.fecha_fin)}
      </p>
      <BannerAviso tono="confidencial" ojoTachado className="mt-3">
        {avisoAnonimato(umbral)}
      </BannerAviso>
      {yaRespondi ? (
        <BannerAviso tono="exito" className="mt-2">
          Ya contestaste esta encuesta. Puedes volver a contestarla y tu respuesta anterior se
          reemplaza; el sistema sabe que ya participaste, no qué contestaste.
        </BannerAviso>
      ) : null}
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogTrigger asChild>
          <Button variant={yaRespondi ? "outline" : "default"} className="mt-3 rounded-xl">
            {yaRespondi ? "Volver a contestar" : "Contestar la encuesta"}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">{vigente.nombre}</DialogTitle>
          </DialogHeader>
          <p className="text-[12px] text-cota">{avisoAnonimato(umbral)}</p>
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
                        "cifra min-h-10 rounded-lg px-1 py-2 text-[13px] transition-colors",
                        respuestas[r.clave] === v
                          ? "bg-grafito text-cal"
                          : "bg-muted text-grafito hover:bg-info-suave hover:text-info",
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
            className="rounded-xl"
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
