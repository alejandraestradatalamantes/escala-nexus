import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EsqueletoTabla } from "@/components/nexus/esqueletos";
import { fechaCorta, numero } from "@/lib/nexus/formato";
import {
  ETIQUETA_TIPO,
  UMBRAL_POR_OMISION,
  colorEspera,
  diasHabilesDesde,
  seTraslapan,
} from "@/lib/nexus/tiempo";
import { cn } from "@/lib/utils";

interface Props {
  miColaboradorId: string | null;
}

interface Persona {
  id: string;
  nombre: string;
  proyecto_actual_id: string | null;
}

/** Bandeja de autorización con alerta de traslape en el mismo proyecto. */
export function PorAprobar({ miColaboradorId }: Props) {
  const queryClient = useQueryClient();
  const [rechazando, setRechazando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["tiempo-por-aprobar"],
    retry: 3,
    queryFn: async () => {
      const [sols, cols, proys] = await Promise.all([
        supabase
          .from("solicitudes")
          .select("*")
          .in("estatus", ["pendiente", "aprobada"])
          .order("fecha_solicitud", { ascending: true }),
        supabase.from("colaboradores").select("id, nombre, proyecto_actual_id"),
        supabase.from("proyectos").select("id, nombre"),
      ]);
      const supuestos = await supabase
        .from("supuestos_financieros")
        .select("clave, valor")
        .eq("clave", "dias_habiles_respuesta_solicitud")
        .maybeSingle();
      return {
        solicitudes: sols.data ?? [],
        personas: (cols.data ?? []) as Persona[],
        proyectos: proys.data ?? [],
        umbral: supuestos.data?.valor ?? UMBRAL_POR_OMISION,
      };
    },
  });

  const resolver = useMutation({
    mutationFn: async ({
      id,
      estatus,
      razon,
    }: {
      id: string;
      estatus: "aprobada" | "rechazada";
      razon?: string;
    }) => {
      const { error } = await supabase
        .from("solicitudes")
        .update({
          estatus,
          aprobador_id: miColaboradorId,
          fecha_resolucion: new Date().toISOString(),
          ...(razon ? { motivo: razon } : {}),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.estatus === "aprobada" ? "Solicitud autorizada" : "Solicitud rechazada");
      setRechazando(null);
      setMotivo("");
      queryClient.invalidateQueries({ queryKey: ["tiempo-por-aprobar"] });
      queryClient.invalidateQueries({ queryKey: ["tiempo-mis-solicitudes"] });
      queryClient.invalidateQueries({ queryKey: ["tiempo-cobertura"] });
      queryClient.invalidateQueries({ queryKey: ["tiempo-indicadores"] });
    },
    onError: () =>
      toast.error("No se pudo resolver la solicitud. Solo el líder directo o Talento pueden."),
  });

  if (isLoading || !data) return <EsqueletoTabla filas={6} columnas={6} />;

  const persona = (id: string) => data.personas.find((p) => p.id === id);
  const proyecto = (id: string | null | undefined) =>
    data.proyectos.find((p) => p.id === id)?.nombre ?? "Sin proyecto";
  const aprobadas = data.solicitudes.filter((s) => s.estatus === "aprobada");
  const pendientes = data.solicitudes.filter((s) => s.estatus === "pendiente");

  if (pendientes.length === 0) {
    return (
      <p className="border border-border bg-card p-4 text-[13px] text-cota">
        No hay solicitudes pendientes de autorización a tu alcance.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {pendientes.map((s) => {
        const quien = persona(s.colaborador_id);
        const esperando = diasHabilesDesde(s.fecha_solicitud);
        const traslapes = aprobadas.filter((a) => {
          if (a.colaborador_id === s.colaborador_id) return false;
          const otra = persona(a.colaborador_id);
          if (!otra || !quien) return false;
          if (!quien.proyecto_actual_id || otra.proyecto_actual_id !== quien.proyecto_actual_id)
            return false;
          return seTraslapan(s, a);
        });
        return (
          <article key={s.id} className="border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[15px] text-grafito">{quien?.nombre ?? "Colaborador"}</h3>
                <p className="cifra mt-1 text-[12px] text-cota">
                  {ETIQUETA_TIPO[s.tipo] ?? s.tipo} · {fechaCorta(s.fecha_inicio)} —{" "}
                  {fechaCorta(s.fecha_fin)} · {numero(Number(s.dias), 0)} día(s) ·{" "}
                  {proyecto(quien?.proyecto_actual_id)}
                </p>
                {s.motivo ? <p className="mt-1 text-[13px] text-cota">{s.motivo}</p> : null}
              </div>
              <p className={cn("cifra text-[12px]", colorEspera(esperando, data.umbral))}>
                {esperando} día(s) hábil(es) esperando · umbral {data.umbral}
              </p>
            </div>

            {traslapes.length > 0 ? (
              <div className="mt-3 border-l-2 border-desviacion bg-desviacion/10 px-3 py-2 text-[12px] text-grafito">
                Traslape en {proyecto(quien?.proyecto_actual_id)}:{" "}
                {traslapes
                  .map(
                    (t) =>
                      `${persona(t.colaborador_id)?.nombre ?? "otra persona"} (${fechaCorta(t.fecha_inicio)} — ${fechaCorta(t.fecha_fin)})`,
                  )
                  .join("; ")}
                . Autorizar deja el frente sin esa cobertura.
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                disabled={resolver.isPending}
                onClick={() => resolver.mutate({ id: s.id, estatus: "aprobada" })}
                className="h-9 rounded-none text-[12px]"
              >
                Autorizar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setRechazando(s.id);
                  setMotivo("");
                }}
                className="h-9 rounded-none text-[12px]"
              >
                Rechazar
              </Button>
            </div>
          </article>
        );
      })}

      <Dialog open={!!rechazando} onOpenChange={(o) => !o && setRechazando(null)}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>Rechazar solicitud</DialogTitle>
            <DialogDescription>
              El motivo es obligatorio y lo verá la persona en su bandeja.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={500}
            aria-label="Motivo del rechazo"
            placeholder="Por ejemplo: coincide con el cierre de etapa del frente norte."
            className="min-h-[96px] rounded-none text-[13px]"
          />
          <DialogFooter>
            <Button
              disabled={motivo.trim().length < 5 || resolver.isPending}
              onClick={() =>
                rechazando &&
                resolver.mutate({ id: rechazando, estatus: "rechazada", razon: motivo.trim() })
              }
              className="h-10 rounded-none text-[13px]"
            >
              Rechazar con este motivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}