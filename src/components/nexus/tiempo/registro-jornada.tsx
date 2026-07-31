import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { fechaCorta, numero } from "@/lib/nexus/formato";
import { iso } from "@/lib/nexus/tiempo";

interface Props {
  colaboradorId: string | null;
  puedeVerUbicacion: boolean;
}

const ETIQUETA_REGISTRO: Record<string, string> = {
  entrada: "Entrada",
  salida: "Salida",
};

/**
 * Registro de jornada. La ubicación solo se guarda con consentimiento explícito
 * (LFPDPPP) y solo la ven el propio colaborador, su líder y Dirección de Talento.
 */
export function RegistroJornada({ colaboradorId, puedeVerUbicacion }: Props) {
  const queryClient = useQueryClient();
  const [consiente, setConsiente] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["tiempo-jornada", colaboradorId],
    enabled: !!colaboradorId,
    retry: 3,
    queryFn: async () =>
      (
        await supabase
          .from("registros_jornada")
          .select("*")
          .eq("colaborador_id", colaboradorId!)
          .order("created_at", { ascending: false })
          .limit(20)
      ).data ?? [],
  });

  const registrar = useMutation({
    mutationFn: async (tipo: "entrada" | "salida") => {
      if (!colaboradorId) throw new Error("sin expediente");
      let coords: { lat: number; lng: number; precision: number } | null = null;
      if (consiente && typeof navigator !== "undefined" && navigator.geolocation) {
        coords = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (p) =>
              resolve({
                lat: p.coords.latitude,
                lng: p.coords.longitude,
                precision: p.coords.accuracy,
              }),
            () => resolve(null),
            { timeout: 8000 },
          );
        });
      }
      const { error } = await supabase.from("registros_jornada").insert({
        colaborador_id: colaboradorId,
        fecha: iso(new Date()),
        tipo_registro: tipo,
        geo_lat: coords?.lat ?? null,
        geo_lng: coords?.lng ?? null,
        precision_m: coords?.precision ?? null,
        origen: coords ? "navegador con consentimiento" : "navegador sin ubicación",
      });
      if (error) throw error;
      return { tipo, conUbicacion: !!coords };
    },
    onSuccess: (r) => {
      toast.success(
        `${ETIQUETA_REGISTRO[r.tipo]} registrada${r.conUbicacion ? " con ubicación" : " sin ubicación"}`,
      );
      queryClient.invalidateQueries({ queryKey: ["tiempo-jornada"] });
    },
    onError: () => toast.error("No se pudo registrar la jornada."),
  });

  return (
    <div className="space-y-4">
      <section className="border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-cota">
              Aviso de privacidad — registro de jornada
            </h2>
            <p className="mt-1 max-w-2xl text-[13px] text-cota">
              Escala trata tu ubicación como dato personal conforme a la LFPDPPP. La geolocalización
              es opcional: se captura únicamente al marcar entrada o salida, solo si otorgas tu
              consentimiento en esta pantalla, y solo la consultan tú, tu líder directo y Dirección
              de Talento. Puedes retirar el consentimiento en cualquier momento desmarcando la
              casilla; los registros siguen funcionando sin ubicación.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-1">
            <span className="cifra bg-casco/15 px-2 py-1 text-[11px] uppercase tracking-wide text-grafito">
              Requiere visto bueno de Jurídico
            </span>
            <span className="cifra text-[11px] uppercase tracking-wide text-cota">
              Estatus pendiente
            </span>
          </div>
        </div>

        <label className="mt-3 flex items-start gap-2 border-t border-border pt-3 text-[13px] text-grafito">
          <Checkbox
            checked={consiente}
            onCheckedChange={(v) => setConsiente(v === true)}
            aria-label="Consiento el registro de mi ubicación"
            className="mt-0.5 rounded-none"
          />
          Consiento que se guarde mi ubicación al marcar entrada y salida.
        </label>

        {!colaboradorId ? (
          <p className="mt-3 border-l-2 border-casco bg-casco/10 px-3 py-2 text-[12px] text-grafito">
            Tu usuario no está vinculado a un expediente, así que no puedes registrar jornada.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              disabled={registrar.isPending}
              onClick={() => registrar.mutate("entrada")}
              className="h-11 rounded-none text-[13px]"
            >
              Marcar entrada
            </Button>
            <Button
              variant="outline"
              disabled={registrar.isPending}
              onClick={() => registrar.mutate("salida")}
              className="h-11 rounded-none text-[13px]"
            >
              Marcar salida
            </Button>
          </div>
        )}
      </section>

      <section className="border border-border bg-card p-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-cota">
          Mis últimos registros
        </h2>
        {isLoading ? (
          <Skeleton className="mt-3 h-24 w-full rounded-none" />
        ) : !data || data.length === 0 ? (
          <p className="mt-2 text-[13px] text-cota">Todavía no hay registros de jornada.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead className="bg-grafito text-cal">
                <tr>
                  {["Fecha", "Tipo", "Origen", "Ubicación"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-cal">
                    <td className="cifra px-3 py-2 text-cota">{fechaCorta(r.fecha)}</td>
                    <td className="px-3 py-2 text-grafito">
                      {ETIQUETA_REGISTRO[r.tipo_registro ?? ""] ?? r.tipo_registro ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-cota">{r.origen ?? "—"}</td>
                    <td className="cifra px-3 py-2 text-cota">
                      {r.geo_lat === null || r.geo_lng === null
                        ? "Sin ubicación"
                        : puedeVerUbicacion
                          ? `${numero(Number(r.geo_lat), 4)}, ${numero(Number(r.geo_lng), 4)} ±${numero(Number(r.precision_m ?? 0), 0)} m`
                          : "Reservada"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}