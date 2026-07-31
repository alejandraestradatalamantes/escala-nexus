import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EsqueletoTabla } from "@/components/nexus/esqueletos";
import { BandaLineaBase } from "@/components/nexus/banda-linea-base";
import { fechaCorta } from "@/lib/nexus/formato";
import {
  avanceAgenda,
  bloqueosAutorizacion,
  CICLO_ACTUAL,
  ETIQUETA_ESTATUS_AGENDA,
} from "@/lib/nexus/desarrollo";

const TODOS = "__todos__";

/** Panorama de agendas para líder, Dirección de Talento y Dirección General. */
export function AgendasEquipo({
  ciclo = CICLO_ACTUAL,
  onAbrir,
}: {
  ciclo?: string;
  onAbrir: (colaboradorId: string) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [estatus, setEstatus] = useState(TODOS);

  const { data, isLoading } = useQuery({
    queryKey: ["desarrollo-agendas-equipo", ciclo],
    retry: 3,
    queryFn: async () => {
      const [agendas, colaboradores, prioridades, acciones, mapeo] = await Promise.all([
        supabase
          .from("agendas_desarrollo")
          .select("id, colaborador_id, estatus, fecha_autorizacion, vb_lider_en, vb_talento_en")
          .eq("ciclo", ciclo),
        supabase.from("colaboradores").select("id, nombre, area, puesto_id"),
        supabase.from("prioridades_desarrollo").select("id, agenda_id, descripcion"),
        supabase
          .from("acciones_desarrollo")
          .select("id, prioridad_id, estatus, medicion_exito"),
        supabase.from("mapeo_talento").select("colaborador_id, casilla_9box"),
      ]);
      return {
        agendas: agendas.data ?? [],
        colaboradores: colaboradores.data ?? [],
        prioridades: prioridades.data ?? [],
        acciones: acciones.data ?? [],
        mapeo: mapeo.data ?? [],
      };
    },
  });

  const filas = useMemo(() => {
    const nombres = new Map((data?.colaboradores ?? []).map((c) => [c.id, c]));
    const clave = new Set(
      (data?.mapeo ?? [])
        .filter((m) => (m.casilla_9box ?? 0) >= 7)
        .map((m) => m.colaborador_id)
        .filter((x): x is string => !!x),
    );
    const texto = busqueda.trim().toLowerCase();
    return (data?.agendas ?? [])
      .map((a) => {
        const prioridades = (data?.prioridades ?? []).filter((p) => p.agenda_id === a.id);
        const ids = new Set(prioridades.map((p) => p.id));
        const acciones = (data?.acciones ?? []).filter((x) => ids.has(x.prioridad_id));
        const colaborador = a.colaborador_id ? nombres.get(a.colaborador_id) : undefined;
        return {
          id: a.id,
          colaboradorId: a.colaborador_id ?? "",
          nombre: colaborador?.nombre ?? "Sin expediente",
          area: colaborador?.area ?? "—",
          estatus: a.estatus,
          fechaAutorizacion: a.fecha_autorizacion,
          vbLider: !!a.vb_lider_en,
          vbTalento: !!a.vb_talento_en,
          prioridades: prioridades.length,
          acciones: acciones.length,
          avance: avanceAgenda(acciones),
          bloqueos: bloqueosAutorizacion(prioridades, acciones).length,
          talentoClave: clave.has(a.colaborador_id ?? ""),
        };
      })
      .filter((f) => (estatus === TODOS ? true : f.estatus === estatus))
      .filter((f) => texto === "" || f.nombre.toLowerCase().includes(texto))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [data, busqueda, estatus]);

  const sinAgenda = useMemo(() => {
    const conAgenda = new Set((data?.agendas ?? []).map((a) => a.colaborador_id));
    return (data?.colaboradores ?? []).filter((c) => !conAgenda.has(c.id)).length;
  }, [data]);

  if (isLoading) return <EsqueletoTabla filas={6} columnas={7} />;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="agenda-busqueda">Buscar</Label>
          <Input
            id="agenda-busqueda"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Colaborador"
            className="h-10 w-64 max-w-full rounded-none text-[13px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="agenda-estatus">Estatus</Label>
          <Select value={estatus} onValueChange={setEstatus}>
            <SelectTrigger id="agenda-estatus" className="h-10 w-52 rounded-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value={TODOS} className="rounded-none">
                Todos
              </SelectItem>
              {Object.entries(ETIQUETA_ESTATUS_AGENDA).map(([clave, etiqueta]) => (
                <SelectItem key={clave} value={clave} className="rounded-none">
                  {etiqueta}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="cifra pb-2.5 text-[12px] text-cota">
          {filas.length} agendas visibles · {sinAgenda} personas sin agenda del ciclo {ciclo}
        </p>
      </div>

      {filas.length === 0 ? (
        <p className="border border-dashed border-border p-6 text-center text-[13px] text-cota">
          No hay agendas visibles con este filtro.
        </p>
      ) : (
        <div className="overflow-x-auto border border-border bg-card">
          <table className="w-full min-w-[900px] text-left text-[13px]">
            <thead className="bg-grafito text-cal">
              <tr>
                {[
                  "Colaborador",
                  "Área",
                  "Estatus",
                  "Prioridades",
                  "Acciones",
                  "Avance",
                  "Autorización",
                  "",
                ].map((h, i) => (
                  <th
                    key={i}
                    className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id} className="border-t border-border transition-colors hover:bg-muted">
                  <td className="px-3 py-2 text-grafito">
                    {f.nombre}
                    {f.talentoClave ? (
                      <span className="cifra ml-2 border border-casco px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-casco">
                        Talento clave
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-cota">{f.area}</td>
                  <td className="px-3 py-2 text-cota">
                    {ETIQUETA_ESTATUS_AGENDA[f.estatus] ?? f.estatus}
                  </td>
                  <td className="cifra px-3 py-2">{f.prioridades}</td>
                  <td className="cifra px-3 py-2">{f.acciones}</td>
                  <td className="w-56 px-3 py-2">
                    {f.avance === null ? (
                      <span className="text-[12px] text-cota">Sin acciones</span>
                    ) : (
                      <BandaLineaBase
                        valor={f.avance}
                        meta={80}
                        min={0}
                        max={100}
                        unidad="%"
                        decimales={0}
                        etiquetaMeta="Línea base"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 text-[12px] text-cota">
                    {f.estatus === "autorizada" ? (
                      <span className="cifra text-linea">
                        {fechaCorta(f.fechaAutorizacion)}
                      </span>
                    ) : f.bloqueos > 0 ? (
                      <span className="text-desviacion">{f.bloqueos} pendientes</span>
                    ) : (
                      <span>
                        {f.vbLider ? "VB líder" : "sin VB líder"} ·{" "}
                        {f.vbTalento ? "VB talento" : "sin VB talento"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      variant="outline"
                      onClick={() => onAbrir(f.colaboradorId)}
                      className="h-9 rounded-none text-[12px]"
                    >
                      Abrir
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}