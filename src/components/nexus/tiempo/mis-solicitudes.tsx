import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { SelectorBuscador } from "@/components/nexus/selector-buscador";
import { EsqueletoTabla } from "@/components/nexus/esqueletos";
import { fechaCorta, numero } from "@/lib/nexus/formato";
import {
  CLASE_ESTATUS,
  ETIQUETA_ESTATUS,
  ETIQUETA_TIPO,
  TIPOS,
  aniosDeServicio,
  consumeSaldo,
  diasHabiles,
  diasLeyDeCatalogo,
  iso,
  primaVacacional,
  proximoAniversario,
} from "@/lib/nexus/tiempo";
import { cn } from "@/lib/utils";

interface Props {
  colaboradorId: string | null;
  esTalento: boolean;
}

/** Mi saldo de vacaciones y el formulario de tres toques para pedir tiempo. */
export function MisSolicitudes({ colaboradorId, esTalento }: Props) {
  const queryClient = useQueryClient();
  const [tipo, setTipo] = useState("vacaciones");
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");
  const [motivo, setMotivo] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["tiempo-mis-solicitudes", colaboradorId],
    enabled: !!colaboradorId,
    retry: 3,
    queryFn: async () => {
      const [colaborador, saldo, solicitudes, catalogo, supuestos] = await Promise.all([
        supabase
          .from("colaboradores")
          .select("id, nombre, fecha_ingreso, proyecto_actual_id")
          .eq("id", colaboradorId!)
          .maybeSingle(),
        supabase
          .from("saldos_vacaciones")
          .select("*")
          .eq("colaborador_id", colaboradorId!)
          .maybeSingle(),
        supabase
          .from("solicitudes")
          .select("*")
          .eq("colaborador_id", colaboradorId!)
          .order("fecha_solicitud", { ascending: false }),
        supabase
          .from("catalogo_vacaciones_lft")
          .select("anios_min, anios_max, dias_ley")
          .order("anios_min"),
        supabase.from("supuestos_financieros").select("clave, valor"),
      ]);
      return {
        colaborador: colaborador.data,
        saldo: saldo.data,
        solicitudes: solicitudes.data ?? [],
        catalogo: catalogo.data ?? [],
        primaPct:
          supuestos.data?.find((s) => s.clave === "prima_vacacional_pct")?.valor ?? null,
      };
    },
  });

  const diasSolicitados = useMemo(() => diasHabiles(inicio, fin), [inicio, fin]);
  const disponibles = Number(data?.saldo?.dias_disponibles ?? 0);
  const excedeSaldo = consumeSaldo(tipo) && diasSolicitados > disponibles;

  const crear = useMutation({
    mutationFn: async () => {
      if (!colaboradorId) throw new Error("sin expediente");
      if (!inicio || !fin) throw new Error("faltan fechas");
      if (fin < inicio) throw new Error("rango inválido");
      if (diasSolicitados < 1) throw new Error("sin días hábiles");
      if (excedeSaldo && !esTalento) throw new Error("excede el saldo");
      const { error } = await supabase.from("solicitudes").insert({
        colaborador_id: colaboradorId,
        tipo,
        fecha_inicio: inicio,
        fecha_fin: fin,
        dias: diasSolicitados,
        motivo: motivo.trim() || null,
        estatus: "pendiente",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitud enviada. Queda pendiente de autorización.");
      setInicio("");
      setFin("");
      setMotivo("");
      queryClient.invalidateQueries({ queryKey: ["tiempo-mis-solicitudes"] });
      queryClient.invalidateQueries({ queryKey: ["tiempo-indicadores"] });
      queryClient.invalidateQueries({ queryKey: ["tiempo-por-aprobar"] });
      queryClient.invalidateQueries({ queryKey: ["tiempo-cobertura"] });
    },
    onError: (e: Error) =>
      toast.error(
        e.message === "excede el saldo"
          ? "Los días solicitados exceden tu saldo disponible."
          : e.message === "sin días hábiles"
            ? "El rango no contiene días hábiles."
            : "No se pudo enviar la solicitud. Revisa las fechas.",
      ),
  });

  const cancelar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("solicitudes")
        .update({ estatus: "cancelada", fecha_resolucion: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitud cancelada");
      queryClient.invalidateQueries({ queryKey: ["tiempo-mis-solicitudes"] });
      queryClient.invalidateQueries({ queryKey: ["tiempo-por-aprobar"] });
    },
    onError: () => toast.error("No se pudo cancelar la solicitud."),
  });

  if (!colaboradorId) {
    return (
      <p className="border-l-2 border-casco bg-casco/10 px-3 py-2 text-[13px] text-grafito">
        Tu usuario todavía no está vinculado a un expediente de colaborador, así que no hay saldo
        que mostrar. Dirección de Talento puede vincularlo en Configuración › Usuarios y accesos.
      </p>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-none" />
        <EsqueletoTabla filas={5} columnas={5} />
      </div>
    );
  }

  const anios = aniosDeServicio(data.colaborador?.fecha_ingreso);
  const diasLeyCatalogo = diasLeyDeCatalogo(data.catalogo, anios);
  const aniversario = proximoAniversario(data.colaborador?.fecha_ingreso);
  const prima = primaVacacional(Number(data.saldo?.dias_ley ?? 0), data.primaPct);

  return (
    <div className="space-y-5">
      <section className="border border-border bg-card p-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-cota">
          Mi saldo de vacaciones
        </h2>
        {!data.saldo ? (
          <p className="mt-2 text-[13px] text-cota">
            Aún no hay saldo calculado para tu expediente. Se deriva de tu fecha de ingreso y del
            catálogo del artículo 76.
          </p>
        ) : (
          <div className="mt-3 grid gap-4 md:grid-cols-[auto_minmax(0,1fr)]">
            <div>
              <p className="cifra text-[44px] leading-none text-grafito">
                {numero(Number(data.saldo.dias_disponibles), 1)}
                <span className="ml-1 text-base text-cota">días disponibles</span>
              </p>
              <div className="mt-3 flex h-3 w-full min-w-[240px] overflow-hidden bg-cota/15">
                <div
                  className="bg-linea"
                  style={{
                    width: `${Math.min(100, (Number(data.saldo.dias_disponibles) / Math.max(1, Number(data.saldo.dias_ley) + Number(data.saldo.dias_adicionales))) * 100)}%`,
                  }}
                />
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-4">
              {[
                ["Días de ley", numero(Number(data.saldo.dias_ley), 1)],
                ["Adicionales de Escala", numero(Number(data.saldo.dias_adicionales), 1)],
                ["Tomados", numero(Number(data.saldo.dias_tomados), 1)],
                ["Año de servicio", anios === null ? "—" : String(data.saldo.anio_servicio ?? anios)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11px] uppercase tracking-wide text-cota">{k}</dt>
                  <dd className="cifra text-grafito">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        <p className="mt-3 border-t border-border pt-2 text-[11px] text-cota">
          Artículo 76 de la Ley Federal del Trabajo (reforma 2023). Con {anios ?? "—"} año(s) de
          servicio te corresponden{" "}
          <span className="cifra">{diasLeyCatalogo === null ? "—" : diasLeyCatalogo}</span> días de
          ley según el catálogo vigente en Configuración › Vacaciones. Tu saldo cambia el{" "}
          <span className="cifra">{aniversario ? fechaCorta(aniversario) : "—"}</span>.
          {prima === null
            ? " Prima vacacional no calculable: falta el supuesto prima_vacacional_pct."
            : ` Prima vacacional equivalente a ${numero(prima, 1)} días de salario (${numero(data.primaPct, 0)}% del artículo 80).`}
        </p>
      </section>

      <section className="border border-border bg-card p-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-cota">
          Nueva solicitud
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wide text-cota">Tipo</label>
            <SelectorBuscador
              opciones={TIPOS.map((t) => ({ valor: t.clave, etiqueta: t.etiqueta }))}
              valor={tipo}
              onCambio={setTipo}
              ariaLabel="Tipo de solicitud"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="inicio" className="text-[11px] uppercase tracking-wide text-cota">
              Del
            </label>
            <Input
              id="inicio"
              type="date"
              value={inicio}
              min={iso(new Date())}
              onChange={(e) => setInicio(e.target.value)}
              className="cifra h-10 rounded-none"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="fin" className="text-[11px] uppercase tracking-wide text-cota">
              Al
            </label>
            <Input
              id="fin"
              type="date"
              value={fin}
              min={inicio || iso(new Date())}
              onChange={(e) => setFin(e.target.value)}
              className="cifra h-10 rounded-none"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => crear.mutate()}
              disabled={crear.isPending || !inicio || !fin || (excedeSaldo && !esTalento)}
              className="h-10 w-full rounded-none text-[13px]"
            >
              Enviar solicitud
            </Button>
          </div>
        </div>
        <Textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          maxLength={500}
          placeholder="Motivo (opcional)"
          aria-label="Motivo de la solicitud"
          className="mt-3 min-h-[64px] rounded-none text-[13px]"
        />
        <p className="mt-2 text-[12px] text-cota">
          {inicio && fin
            ? `${diasSolicitados} día(s) hábil(es) contados de lunes a viernes. No se descuentan días festivos oficiales: verifícalos con Talento.`
            : "Elige tipo y fechas; los días hábiles se calculan solos."}
        </p>
        {excedeSaldo ? (
          <p className="mt-2 border-l-2 border-desviacion bg-desviacion/10 px-3 py-2 text-[12px] text-grafito">
            Los {diasSolicitados} días exceden tu saldo de {numero(disponibles, 1)} días.
            {esTalento
              ? " Como Dirección de Talento puedes registrarla de todos modos; quedará documentada como excepción."
              : " Ajusta las fechas o solicita una excepción a Dirección de Talento."}
          </p>
        ) : null}
      </section>

      <section className="border border-border bg-card p-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-cota">
          Mis solicitudes
        </h2>
        {data.solicitudes.length === 0 ? (
          <p className="mt-2 text-[13px] text-cota">Todavía no has registrado solicitudes.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className="bg-grafito text-cal">
                <tr>
                  {["Tipo", "Periodo", "Días", "Estatus", "Solicitada", ""].map((h) => (
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
                {data.solicitudes.map((s) => (
                  <tr key={s.id} className="border-t border-border hover:bg-cal">
                    <td className="px-3 py-2 text-grafito">{ETIQUETA_TIPO[s.tipo] ?? s.tipo}</td>
                    <td className="cifra px-3 py-2 text-cota">
                      {fechaCorta(s.fecha_inicio)} — {fechaCorta(s.fecha_fin)}
                    </td>
                    <td className="cifra px-3 py-2 text-grafito">{numero(Number(s.dias), 0)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "cifra px-2 py-1 text-[11px] uppercase tracking-wide",
                          CLASE_ESTATUS[s.estatus] ?? "bg-cota/15 text-cota",
                        )}
                      >
                        {ETIQUETA_ESTATUS[s.estatus] ?? s.estatus}
                      </span>
                      {s.estatus === "rechazada" && s.motivo ? (
                        <span className="mt-1 block text-[11px] text-desviacion">{s.motivo}</span>
                      ) : null}
                    </td>
                    <td className="cifra px-3 py-2 text-cota">{fechaCorta(s.fecha_solicitud)}</td>
                    <td className="px-3 py-2 text-right">
                      {s.estatus === "pendiente" ? (
                        <Button
                          variant="outline"
                          disabled={cancelar.isPending}
                          onClick={() => cancelar.mutate(s.id)}
                          className="h-9 rounded-none text-[12px]"
                        >
                          Cancelar
                        </Button>
                      ) : null}
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