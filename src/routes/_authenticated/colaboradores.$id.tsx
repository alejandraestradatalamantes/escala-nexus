import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { antiguedadAnios, fechaCorta, iniciales, numero } from "@/lib/nexus/formato";
import { BandaLineaBase } from "@/components/nexus/banda-linea-base";
import { HistorialDesempeno } from "@/components/nexus/desempeno/historial-desempeno";
import { useSesion } from "@/hooks/use-sesion";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/colaboradores/$id")({
  head: () => ({
    meta: [
      { title: "Expediente — ESCALA Nexus" },
      { name: "description", content: "Expediente del colaborador: datos, documentos, certificaciones y ubicación actual." },
      { property: "og:title", content: "Expediente — ESCALA Nexus" },
      { property: "og:description", content: "Expediente del colaborador en Nexus." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Expediente,
});

function Expediente() {
  const { id } = Route.useParams();
  const { tiene } = useSesion();
  const puedeEditar = tiene("direccion_talento");
  const queryClient = useQueryClient();
  const [abrirDocumento, setAbrirDocumento] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["colaborador", id],
    queryFn: async () => {
      const [c, docs, certs, puestos, proyectos] = await Promise.all([
        supabase.from("colaboradores").select("*").eq("id", id).maybeSingle(),
        supabase.from("documentos").select("*").eq("colaborador_id", id),
        supabase.from("certificaciones").select("*").eq("colaborador_id", id).order("fecha_vencimiento"),
        supabase.from("puestos").select("id, nombre"),
        supabase.from("proyectos").select("id, nombre, ciudad"),
      ]);
      return {
        colaborador: c.data,
        documentos: docs.data ?? [],
        certificaciones: certs.data ?? [],
        puestos: puestos.data ?? [],
        proyectos: proyectos.data ?? [],
      };
    },
  });

  const guardar = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase
        .from("colaboradores")
        .update({
          nombre: String(form.get("nombre")),
          correo: String(form.get("correo")) || null,
          area: String(form.get("area")) || null,
          ubicacion: String(form.get("ubicacion")) as "corporativo" | "campo",
          proyecto_actual_id: (form.get("proyecto_id") as string) || null,
          puesto_id: (form.get("puesto_id") as string) || null,
          tipo_contrato: String(form.get("tipo_contrato")) || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Expediente actualizado");
      queryClient.invalidateQueries({ queryKey: ["colaborador", id] });
      queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
    },
    onError: () => toast.error("No se guardaron los cambios. Revisa tus permisos y vuelve a intentar."),
  });

  const darBaja = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("colaboradores").update({ estatus: "baja" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Baja registrada");
      queryClient.invalidateQueries({ queryKey: ["colaborador", id] });
      queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
    },
    onError: () => toast.error("No se registró la baja. Revisa tus permisos."),
  });

  const adjuntar = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase.from("documentos").insert({
        colaborador_id: id,
        tipo: String(form.get("tipo")),
        url: String(form.get("url")) || null,
        vigencia: String(form.get("vigencia")) || null,
        confidencial: form.get("confidencial") === "on",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Documento adjuntado al expediente");
      setAbrirDocumento(false);
      queryClient.invalidateQueries({ queryKey: ["colaborador", id] });
    },
    onError: () => toast.error("No se adjuntó el documento. Revisa tus permisos y vuelve a intentar."),
  });

  if (isLoading)
    return (
      <div className="space-y-5">
        <Skeleton className="h-4 w-28 rounded-none" />
        <Skeleton className="h-20 w-full rounded-none" />
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36 rounded-none" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-none" />
      </div>
    );
  const c = data?.colaborador;
  if (!c)
    return (
      <div className="border border-dashed border-border bg-card p-8">
        <p className="text-[13px] text-cota">Este expediente no existe o no tienes acceso a él.</p>
        <Link to="/colaboradores" className="mt-3 inline-block text-[13px] text-plomada underline">
          Volver al directorio
        </Link>
      </div>
    );

  const proyecto = data.proyectos.find((p) => p.id === c.proyecto_actual_id);
  const vigentes = data.certificaciones.filter(
    (x) => x.fecha_vencimiento && new Date(x.fecha_vencimiento) >= new Date(),
  ).length;
  const selectCls = "h-10 w-full border border-border bg-card px-2 text-[13px] text-grafito";

  return (
    <div className="space-y-5">
      <Link to="/colaboradores" className="inline-flex items-center gap-1 text-[13px] text-cota hover:text-plomada">
        <ArrowLeft className="h-4 w-4" /> Directorio
      </Link>

      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border border-border bg-card p-4 sm:flex sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="cifra grid h-12 w-12 shrink-0 place-items-center bg-plomada text-sm text-primary-foreground">
            {iniciales(c.nombre)}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl text-grafito">{c.nombre}</h1>
            <p className="truncate text-[13px] text-cota">
              {data.puestos.find((p) => p.id === c.puesto_id)?.nombre ?? "Sin puesto"} · {c.area ?? "—"}
            </p>
          </div>
        </div>
        <span
          className={`cifra shrink-0 px-2 py-1 text-[11px] uppercase tracking-wide ${
            c.estatus === "activo" ? "bg-linea/12 text-linea" : "bg-desviacion/12 text-desviacion"
          }`}
        >
          {c.estatus}
        </span>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="border border-border bg-card p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-cota">Antigüedad</h2>
          <p className="cifra mt-2 text-2xl text-grafito">{numero(antiguedadAnios(c.fecha_ingreso))} años</p>
          <div className="mt-3">
            <BandaLineaBase
              valor={antiguedadAnios(c.fecha_ingreso)}
              meta={4}
              min={0}
              max={10}
              unidad=" años"
              etiquetaMeta="Meta firma"
            />
          </div>
        </div>
        <div className="border border-border bg-card p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-cota">Ubicación actual</h2>
          <p className="mt-2 text-sm capitalize text-grafito">{c.ubicacion}</p>
          <p className="mt-1 text-[13px] text-cota">
            {proyecto ? `${proyecto.nombre} · ${proyecto.ciudad ?? ""}` : "Corporativo Valle Oriente"}
          </p>
        </div>
        <div className="border border-border bg-card p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-cota">Certificaciones vigentes</h2>
          <p className="cifra mt-2 text-2xl text-grafito">
            {vigentes}/{data.certificaciones.length}
          </p>
          <p className="cifra mt-1 text-[11px] text-cota">Ingreso {fechaCorta(c.fecha_ingreso)}</p>
        </div>
      </div>

      <Tabs defaultValue="datos">
        <TabsList className="rounded-none">
          <TabsTrigger value="datos" className="rounded-none">Datos</TabsTrigger>
          <TabsTrigger value="documentos" className="rounded-none">Documentos</TabsTrigger>
          <TabsTrigger value="certificaciones" className="rounded-none">Certificaciones</TabsTrigger>
          <TabsTrigger value="desempeno" className="rounded-none">Desempeño</TabsTrigger>
        </TabsList>

        <TabsContent value="datos" className="border border-border bg-card p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              guardar.mutate(new FormData(e.currentTarget));
            }}
            className="grid gap-3 sm:grid-cols-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" name="nombre" defaultValue={c.nombre} disabled={!puedeEditar} className="h-10 rounded-none" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="correo">Correo</Label>
              <Input id="correo" name="correo" defaultValue={c.correo ?? ""} disabled={!puedeEditar} className="h-10 rounded-none" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="area">Área</Label>
              <Input id="area" name="area" defaultValue={c.area ?? ""} disabled={!puedeEditar} className="h-10 rounded-none" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="puesto_id">Puesto</Label>
              <select id="puesto_id" name="puesto_id" defaultValue={c.puesto_id ?? ""} disabled={!puedeEditar} className={selectCls}>
                <option value="">Sin asignar</option>
                {data.puestos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ubicacion">Ubicación</Label>
              <select id="ubicacion" name="ubicacion" defaultValue={c.ubicacion} disabled={!puedeEditar} className={selectCls}>
                <option value="corporativo">Corporativo</option>
                <option value="campo">Campo</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proyecto_id">Proyecto</Label>
              <select id="proyecto_id" name="proyecto_id" defaultValue={c.proyecto_actual_id ?? ""} disabled={!puedeEditar} className={selectCls}>
                <option value="">Sin proyecto</option>
                {data.proyectos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tipo_contrato">Tipo de contrato</Label>
              <select id="tipo_contrato" name="tipo_contrato" defaultValue={c.tipo_contrato ?? "indeterminado"} disabled={!puedeEditar} className={selectCls}>
                <option value="indeterminado">Indeterminado</option>
                <option value="determinado">Determinado</option>
                <option value="obra_determinada">Por obra determinada</option>
              </select>
            </div>
            {puedeEditar && (
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <Button type="submit" disabled={guardar.isPending} className="h-10 rounded-none">
                  Guardar cambios
                </Button>
                {c.estatus === "activo" && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-none border-desviacion text-desviacion"
                    onClick={() => darBaja.mutate()}
                  >
                    Registrar baja
                  </Button>
                )}
              </div>
            )}
            <p className="cifra sm:col-span-2 text-[11px] text-casco">
              Los cambios de contrato y baja requieren respaldo documental conforme a la LFT — [Pendiente de
              visto bueno de Jurídico]
            </p>
          </form>
        </TabsContent>

        <TabsContent value="documentos" className="border border-border bg-card p-4">
          {puedeEditar && (
            <Dialog open={abrirDocumento} onOpenChange={setAbrirDocumento}>
              <DialogTrigger asChild>
                <Button className="mb-3 h-10 rounded-none">
                  <Plus className="mr-1 h-4 w-4" /> Adjuntar documento
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-none">
                <DialogHeader>
                  <DialogTitle>Adjuntar documento</DialogTitle>
                </DialogHeader>
                <form
                  id="form-documento"
                  onSubmit={(e) => {
                    e.preventDefault();
                    adjuntar.mutate(new FormData(e.currentTarget));
                  }}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="d_tipo">Tipo de documento</Label>
                    <select id="d_tipo" name="tipo" required className={selectCls}>
                      {[
                        "Contrato individual de trabajo",
                        "Identificación oficial",
                        "CURP",
                        "RFC",
                        "Comprobante de domicilio",
                        "Constancia DC-3",
                        "Alta ante el IMSS",
                        "Otro",
                      ].map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="d_url">Archivo (enlace al expediente digital)</Label>
                    <Input
                      id="d_url"
                      name="url"
                      type="url"
                      placeholder="https://"
                      className="h-10 rounded-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="d_vigencia">Fecha de vencimiento</Label>
                    <Input id="d_vigencia" name="vigencia" type="date" className="h-10 rounded-none" />
                  </div>
                  <label className="flex items-center gap-2 self-end text-[13px] text-grafito">
                    <input type="checkbox" name="confidencial" className="h-4 w-4" />
                    Confidencial
                  </label>
                </form>
                <DialogFooter>
                  <Button
                    form="form-documento"
                    type="submit"
                    disabled={adjuntar.isPending}
                    className="h-10 rounded-none"
                  >
                    Adjuntar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {data.documentos.length === 0 ? (
            <p className="text-[13px] text-cota">
              Aún no hay documentos en este expediente.
              {puedeEditar
                ? " Usa Adjuntar documento para registrar el primero."
                : " Dirección de Talento puede adjuntar el primero."}
            </p>
          ) : (
            <ul className="divide-y divide-border text-[13px]">
              {data.documentos.map((d) => (
                <li key={d.id} className="flex h-10 items-center justify-between gap-3">
                  <span className="truncate">
                    {d.url ? (
                      <a href={d.url} target="_blank" rel="noreferrer" className="text-plomada underline">
                        {d.tipo}
                      </a>
                    ) : (
                      d.tipo
                    )}
                    {d.confidencial ? <span className="ml-2 text-[11px] text-casco">Confidencial</span> : null}
                  </span>
                  <span className="cifra text-cota">{fechaCorta(d.vigencia)}</span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="certificaciones" className="border border-border bg-card p-4">
          {data.certificaciones.length === 0 ? (
            <p className="text-[13px] text-cota">
              Aún no hay certificaciones registradas. Captura la primera para que cuente en el indicador.
            </p>
          ) : (
            <ul className="divide-y divide-border text-[13px]">
              {data.certificaciones.map((x) => {
                const vigente = x.fecha_vencimiento && new Date(x.fecha_vencimiento) >= new Date();
                return (
                  <li key={x.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{x.nombre}</p>
                      <p className="cifra text-[11px] text-cota">
                        {x.organismo} · Folio {x.folio}
                        {x.patrocinada_por_escala ? " · Patrocinada por Escala" : ""}
                      </p>
                    </div>
                    <span className={`cifra shrink-0 text-[11px] ${vigente ? "text-linea" : "text-desviacion"}`}>
                      {vigente ? "Vigente" : "Vencida"} {fechaCorta(x.fecha_vencimiento)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="desempeno" className="border border-border bg-card p-4">
          <HistorialDesempeno colaboradorId={id} puestoId={c.puesto_id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}