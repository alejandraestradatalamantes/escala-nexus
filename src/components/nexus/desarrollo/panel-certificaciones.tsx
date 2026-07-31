import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SelectorBuscador } from "@/components/nexus/selector-buscador";
import { EsqueletoTabla } from "@/components/nexus/esqueletos";
import { fechaCorta, numero } from "@/lib/nexus/formato";
import {
  CLASE_SEMAFORO,
  DIAS_AVISO_VENCIMIENTO,
  ETIQUETA_SEMAFORO,
  semaforoCertificacion,
  type Semaforo,
} from "@/lib/nexus/desarrollo";
import { cn } from "@/lib/utils";

const TODAS = "__todas__";

const FORMULARIO_VACIO = {
  colaborador_id: "",
  nombre: "",
  organismo: "",
  folio: "",
  fecha_obtencion: "",
  fecha_vencimiento: "",
  costo: "",
  patrocinada: true,
};

/** Registro de certificaciones con semáforo de vencimiento y costo en riesgo. */
export function PanelCertificaciones({ esTalento }: { esTalento: boolean }) {
  const queryClient = useQueryClient();
  const [filtro, setFiltro] = useState<string>(TODAS);
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState(FORMULARIO_VACIO);

  const { data, isLoading } = useQuery({
    queryKey: ["desarrollo-certificaciones"],
    retry: 3,
    queryFn: async () => {
      const [certificaciones, colaboradores] = await Promise.all([
        supabase
          .from("certificaciones")
          .select(
            "id, colaborador_id, nombre, organismo, folio, fecha_obtencion, fecha_vencimiento, costo, patrocinada_por_escala",
          )
          .order("fecha_vencimiento"),
        supabase.from("colaboradores").select("id, nombre, area").eq("estatus", "activo"),
      ]);
      return {
        certificaciones: certificaciones.data ?? [],
        colaboradores: colaboradores.data ?? [],
      };
    },
  });

  const filas = useMemo(() => {
    const nombres = new Map((data?.colaboradores ?? []).map((c) => [c.id, c.nombre]));
    const texto = busqueda.trim().toLowerCase();
    return (data?.certificaciones ?? [])
      .map((c) => ({
        ...c,
        colaborador: nombres.get(c.colaborador_id) ?? "Sin expediente",
        semaforo: semaforoCertificacion(c.fecha_vencimiento),
      }))
      .filter((c) => (filtro === TODAS ? true : c.semaforo === filtro))
      .filter(
        (c) =>
          texto === "" ||
          c.nombre.toLowerCase().includes(texto) ||
          c.colaborador.toLowerCase().includes(texto),
      );
  }, [data, filtro, busqueda]);

  const todas = useMemo(
    () =>
      (data?.certificaciones ?? []).map((c) => ({
        ...c,
        semaforo: semaforoCertificacion(c.fecha_vencimiento),
      })),
    [data],
  );

  const costoVencidas = todas
    .filter((c) => c.semaforo === "vencida")
    .reduce((s, c) => s + (c.costo ?? 0), 0);
  const costoPorVencer = todas
    .filter((c) => c.semaforo === "por_vencer")
    .reduce((s, c) => s + (c.costo ?? 0), 0);

  const registrar = useMutation({
    mutationFn: async () => {
      if (!form.colaborador_id || form.nombre.trim() === "") throw new Error("datos");
      const { error } = await supabase.from("certificaciones").insert({
        colaborador_id: form.colaborador_id,
        nombre: form.nombre.trim(),
        organismo: form.organismo.trim() || null,
        folio: form.folio.trim() || null,
        fecha_obtencion: form.fecha_obtencion || null,
        fecha_vencimiento: form.fecha_vencimiento || null,
        costo: form.costo === "" ? null : Number(form.costo),
        patrocinada_por_escala: form.patrocinada,
        es_demo: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Certificación registrada");
      setForm(FORMULARIO_VACIO);
      setAbierto(false);
      queryClient.invalidateQueries({ queryKey: ["desarrollo-certificaciones"] });
      queryClient.invalidateQueries({ queryKey: ["desarrollo-indicadores"] });
    },
    onError: (e: Error) =>
      toast.error(
        e.message === "datos"
          ? "Falta el colaborador o el nombre de la certificación."
          : "No se registró la certificación. Requiere rol de Dirección de Talento.",
      ),
  });

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="border-l-2 border-desviacion bg-desviacion/5 p-4">
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-cota">
            Costo de recertificación vencida
          </h3>
          <p className="cifra mt-1 text-[28px] leading-none text-desviacion">
            {numero(costoVencidas, 0)}
            <span className="ml-1 text-base text-cota">MXN</span>
          </p>
          <p className="mt-2 text-[12px] text-cota">
            Suma del costo de las certificaciones con fecha de vencimiento pasada. Es dinero ya
            invertido que dejó de tener validez.
          </p>
        </div>
        <div className="border-l-2 border-casco bg-casco/10 p-4">
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-cota">
            Costo en riesgo a {DIAS_AVISO_VENCIMIENTO} días
          </h3>
          <p className="cifra mt-1 text-[28px] leading-none text-grafito">
            {numero(costoPorVencer, 0)}
            <span className="ml-1 text-base text-cota">MXN</span>
          </p>
          <p className="mt-2 text-[12px] text-cota">
            Certificaciones que vencen dentro del trimestre. Programar la renovación ahora cuesta
            menos que recuperarla después.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cert-busqueda">Buscar</Label>
            <Input
              id="cert-busqueda"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Colaborador o certificación"
              className="h-10 w-64 max-w-full rounded-none text-[13px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cert-semaforo">Estado</Label>
            <Select value={filtro} onValueChange={setFiltro}>
              <SelectTrigger id="cert-semaforo" className="h-10 w-52 rounded-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value={TODAS} className="rounded-none">
                  Todas
                </SelectItem>
                {(["vencida", "por_vencer", "vigente", "sin_fecha"] as Semaforo[]).map((s) => (
                  <SelectItem key={s} value={s} className="rounded-none">
                    {ETIQUETA_SEMAFORO[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {esTalento ? (
          <Dialog open={abierto} onOpenChange={setAbierto}>
            <DialogTrigger asChild>
              <Button className="h-10 rounded-none text-[12px]">Registrar certificación</Button>
            </DialogTrigger>
            <DialogContent className="rounded-none">
              <DialogHeader>
                <DialogTitle>Registrar certificación</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cert-colaborador">Colaborador</Label>
                  <SelectorBuscador
                    id="cert-colaborador"
                    ariaLabel="Colaborador de la certificación"
                    opciones={(data?.colaboradores ?? []).map((c) => ({
                      valor: c.id,
                      etiqueta: c.nombre,
                      detalle: c.area ?? undefined,
                    }))}
                    valor={form.colaborador_id}
                    onCambio={(v) => setForm((f) => ({ ...f, colaborador_id: v }))}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="cert-nombre">Certificación</Label>
                    <Input
                      id="cert-nombre"
                      value={form.nombre}
                      onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                      className="h-10 rounded-none text-[13px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cert-organismo">Organismo</Label>
                    <Input
                      id="cert-organismo"
                      value={form.organismo}
                      onChange={(e) => setForm((f) => ({ ...f, organismo: e.target.value }))}
                      className="h-10 rounded-none text-[13px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cert-folio">Folio</Label>
                    <Input
                      id="cert-folio"
                      value={form.folio}
                      onChange={(e) => setForm((f) => ({ ...f, folio: e.target.value }))}
                      className="cifra h-10 rounded-none text-[13px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cert-costo">Costo (MXN)</Label>
                    <Input
                      id="cert-costo"
                      inputMode="decimal"
                      value={form.costo}
                      onChange={(e) => setForm((f) => ({ ...f, costo: e.target.value }))}
                      className="cifra h-10 rounded-none text-[13px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cert-obtencion">Obtención</Label>
                    <Input
                      id="cert-obtencion"
                      type="date"
                      value={form.fecha_obtencion}
                      onChange={(e) => setForm((f) => ({ ...f, fecha_obtencion: e.target.value }))}
                      className="cifra h-10 rounded-none text-[13px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cert-vencimiento">Vencimiento</Label>
                    <Input
                      id="cert-vencimiento"
                      type="date"
                      value={form.fecha_vencimiento}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, fecha_vencimiento: e.target.value }))
                      }
                      className="cifra h-10 rounded-none text-[13px]"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="cert-patrocinio"
                    checked={form.patrocinada}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, patrocinada: v === true }))}
                  />
                  <Label htmlFor="cert-patrocinio" className="text-[13px] text-cota">
                    Patrocinada por Escala
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button
                  disabled={registrar.isPending}
                  onClick={() => registrar.mutate()}
                  className="h-10 rounded-none"
                >
                  Registrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      {isLoading ? (
        <EsqueletoTabla filas={8} columnas={7} />
      ) : filas.length === 0 ? (
        <p className="border border-dashed border-border p-6 text-center text-[13px] text-cota">
          No hay certificaciones que cumplan el filtro.
        </p>
      ) : (
        <div className="overflow-x-auto border border-border bg-card">
          <table className="w-full min-w-[840px] text-left text-[13px]">
            <thead className="bg-grafito text-cal">
              <tr>
                {[
                  "Colaborador",
                  "Certificación",
                  "Organismo",
                  "Obtención",
                  "Vencimiento",
                  "Estado",
                  "Costo",
                ].map((h) => (
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
              {filas.map((c) => (
                <tr key={c.id} className="border-t border-border transition-colors hover:bg-muted">
                  <td className="px-3 py-2 text-grafito">{c.colaborador}</td>
                  <td className="px-3 py-2 text-grafito">
                    {c.nombre}
                    {c.patrocinada_por_escala ? (
                      <span className="cifra ml-2 text-[11px] uppercase tracking-wide text-cota">
                        Escala
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-cota">{c.organismo ?? "—"}</td>
                  <td className="cifra px-3 py-2 text-cota">{fechaCorta(c.fecha_obtencion)}</td>
                  <td className="cifra px-3 py-2 text-grafito">
                    {fechaCorta(c.fecha_vencimiento)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "cifra border px-2 py-0.5 text-[11px] uppercase tracking-wide",
                        CLASE_SEMAFORO[c.semaforo],
                      )}
                    >
                      {ETIQUETA_SEMAFORO[c.semaforo]}
                    </span>
                  </td>
                  <td className="cifra px-3 py-2 text-grafito">
                    {c.costo === null ? "—" : numero(c.costo, 0)}
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
