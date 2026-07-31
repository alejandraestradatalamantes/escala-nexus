import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TarjetaIndicador } from "@/components/nexus/tarjeta-indicador";
import { SelectorBuscador } from "@/components/nexus/selector-buscador";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TableroFlujo,
  type CandidatoFlujo,
  type FaseFlujo,
} from "@/components/nexus/atraccion/tablero-flujo";
import { fechaCorta, numero } from "@/lib/nexus/formato";
import {
  colorDiasAbierta,
  diasAbierta,
  diasDesde,
  FUENTES,
  pesos,
} from "@/lib/nexus/atraccion";
import { useSesion } from "@/hooks/use-sesion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/atraccion/")({
  head: () => ({
    meta: [
      { title: "Atracción — ESCALA Nexus" },
      {
        name: "description",
        content:
          "Vacantes, embudo de candidatos y tiempo de cobertura medido contra su línea base.",
      },
      { property: "og:title", content: "Atracción — ESCALA Nexus" },
      {
        property: "og:description",
        content: "Embudo de reclutamiento de Escala con línea base y costo de vacancia.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Atraccion,
});

function Atraccion() {
  const { tiene } = useSesion();
  const puedeEditar = tiene("direccion_talento", "reclutamiento");
  const queryClient = useQueryClient();
  const hoy = fechaCorta(new Date());

  const [texto, setTexto] = useState("");
  const [proyecto, setProyecto] = useState("todos");
  const [estatus, setEstatus] = useState("todos");
  const [abrirVacante, setAbrirVacante] = useState(false);
  const [abrirCandidato, setAbrirCandidato] = useState(false);
  const [vacanteCandidato, setVacanteCandidato] = useState("__ninguna");
  const [fuenteCandidato, setFuenteCandidato] = useState<string>(FUENTES[0]);
  const [puestoVacante, setPuestoVacante] = useState("");
  const [proyectoVacante, setProyectoVacante] = useState("__corporativo");
  const [hmVacante, setHmVacante] = useState("__ninguno");

  const { data, isLoading } = useQuery({
    queryKey: ["atraccion"],
    queryFn: async () => {
      const [vacantes, candidatos, fases, puestos, proyectos, colaboradores] = await Promise.all([
        supabase
          .from("vacantes")
          .select(
            "id, puesto_id, proyecto_id, estatus, fecha_apertura, fecha_meta_cobertura, fecha_cierre_real, salario_min, salario_max, hiring_manager_id, motivo, costo_vacante_dia",
          )
          .order("fecha_apertura", { ascending: false }),
        supabase
          .from("candidatos")
          .select("id, nombre, fuente, vacante_id, fase_id, fecha_ingreso_fase, estatus")
          .order("nombre"),
        supabase.from("fases_proceso").select("id, nombre, orden, sla_dias").eq("activa", true).order("orden"),
        supabase.from("puestos").select("id, nombre").order("nombre"),
        supabase.from("proyectos").select("id, nombre").order("nombre"),
        supabase.from("colaboradores").select("id, nombre").order("nombre"),
      ]);
      return {
        vacantes: vacantes.data ?? [],
        candidatos: candidatos.data ?? [],
        fases: fases.data ?? [],
        puestos: puestos.data ?? [],
        proyectos: proyectos.data ?? [],
        colaboradores: colaboradores.data ?? [],
      };
    },
  });

  const vacantes = data?.vacantes ?? [];
  const candidatos = data?.candidatos ?? [];
  const fases: FaseFlujo[] = data?.fases ?? [];

  useEffect(() => {
    if (!puestoVacante && data?.puestos.length) setPuestoVacante(data.puestos[0].id);
  }, [data?.puestos, puestoVacante]);

  const nombrePuesto = (id: string | null) => data?.puestos.find((p) => p.id === id)?.nombre ?? "—";
  const nombreProyecto = (id: string | null) =>
    data?.proyectos.find((p) => p.id === id)?.nombre ?? "Corporativo";
  const nombrePersona = (id: string | null) =>
    data?.colaboradores.find((c) => c.id === id)?.nombre ?? "Sin asignar";

  const abiertas = vacantes.filter((v) => v.estatus === "abierta");
  const cerradas = vacantes.filter((v) => v.estatus === "cerrada");

  const indicadores = useMemo(() => {
    const diasCerradas = cerradas.map((v) => diasAbierta(v) ?? 0);
    const cobertura = diasCerradas.length
      ? diasCerradas.reduce((a, b) => a + b, 0) / diasCerradas.length
      : 0;
    const fueraMeta = abiertas.filter((v) => {
      const dias = diasAbierta(v) ?? 0;
      const objetivo = diasDesde(v.fecha_apertura, v.fecha_meta_cobertura) ?? 0;
      return dias > objetivo;
    }).length;
    const sinCosto = abiertas.filter((v) => v.costo_vacante_dia === null).length;
    const costo = abiertas.reduce(
      (a, v) => a + (diasAbierta(v) ?? 0) * Number(v.costo_vacante_dia ?? 0),
      0,
    );
    return {
      cobertura,
      fueraMeta,
      pctFueraMeta: abiertas.length ? (fueraMeta / abiertas.length) * 100 : 0,
      costo,
      sinCosto,
    };
  }, [abiertas, cerradas]);

  const activosPorVacante = (id: string) =>
    candidatos.filter((c) => c.vacante_id === id && c.estatus !== "descartado").length;

  const filtradas = vacantes.filter(
    (v) =>
      nombrePuesto(v.puesto_id).toLowerCase().includes(texto.toLowerCase()) &&
      (proyecto === "todos" || v.proyecto_id === proyecto) &&
      (estatus === "todos" || v.estatus === estatus),
  );

  const candidatosFlujo: CandidatoFlujo[] = candidatos
    .filter((c) => c.estatus !== "descartado")
    .map((c) => ({
      id: c.id,
      nombre: c.nombre,
      fuente: c.fuente,
      fase_id: c.fase_id,
      fecha_ingreso_fase: c.fecha_ingreso_fase,
      puesto: nombrePuesto(vacantes.find((v) => v.id === c.vacante_id)?.puesto_id ?? null),
    }));

  const refrescar = () => queryClient.invalidateQueries({ queryKey: ["atraccion"] });

  const mover = useMutation({
    mutationFn: async ({ candidato, fase }: { candidato: CandidatoFlujo; fase: FaseFlujo }) => {
      const hoyIso = new Date().toISOString().slice(0, 10);
      const { error } = await supabase
        .from("candidatos")
        .update({ fase_id: fase.id, fecha_ingreso_fase: hoyIso })
        .eq("id", candidato.id);
      if (error) throw error;
      const { error: errorMov } = await supabase.from("movimientos_candidato").insert({
        candidato_id: candidato.id,
        fase_origen: candidato.fase_id,
        fase_destino: fase.id,
        fecha: new Date().toISOString(),
        dias_en_fase: diasDesde(candidato.fecha_ingreso_fase),
      });
      if (errorMov) throw errorMov;
      return fase.nombre;
    },
    onSuccess: (nombre) => {
      toast.success(`Candidato movido a ${nombre}`);
      refrescar();
    },
    onError: () => toast.error("No se movió al candidato. Revisa tus permisos y vuelve a intentar."),
  });

  const descartar = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { error } = await supabase
        .from("candidatos")
        .update({ estatus: "descartado", motivo_descarte: motivo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Candidato descartado con motivo registrado");
      refrescar();
    },
    onError: () => toast.error("No se descartó al candidato. Revisa tus permisos."),
  });

  const nuevaVacante = useMutation({
    mutationFn: async (form: FormData) => {
      const costo = String(form.get("costo_vacante_dia"));
      const min = String(form.get("salario_min"));
      const max = String(form.get("salario_max"));
      const { error } = await supabase.from("vacantes").insert({
        puesto_id: puestoVacante || null,
        proyecto_id: proyectoVacante === "__corporativo" ? null : proyectoVacante,
        hiring_manager_id: hmVacante === "__ninguno" ? null : hmVacante,
        motivo: String(form.get("motivo")) || null,
        salario_min: min ? Number(min) : null,
        salario_max: max ? Number(max) : null,
        fecha_apertura: String(form.get("fecha_apertura")) || null,
        fecha_meta_cobertura: String(form.get("fecha_meta_cobertura")) || null,
        costo_vacante_dia: costo ? Number(costo) : null,
        estatus: "abierta",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vacante abierta");
      setAbrirVacante(false);
      setPuestoVacante("");
      setProyectoVacante("__corporativo");
      setHmVacante("__ninguno");
      refrescar();
    },
    onError: () => toast.error("No se abrió la vacante. Verifica los datos y tus permisos."),
  });

  const nuevoCandidato = useMutation({
    mutationFn: async (form: FormData) => {
      const primera = fases[0];
      const { error } = await supabase.from("candidatos").insert({
        nombre: String(form.get("nombre")),
        correo: String(form.get("correo")) || null,
        telefono: String(form.get("telefono")) || null,
        vacante_id: vacanteCandidato === "__ninguna" ? null : vacanteCandidato,
        fuente: fuenteCandidato || null,
        fase_id: primera?.id ?? null,
        fecha_ingreso_fase: new Date().toISOString().slice(0, 10),
        estatus: "activo",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Candidato registrado en la primera fase");
      setAbrirCandidato(false);
      setVacanteCandidato("__ninguna");
      setFuenteCandidato(FUENTES[0]);
      refrescar();
    },
    onError: () => toast.error("No se registró al candidato. Verifica los datos y tus permisos."),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56 rounded-none" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-52 rounded-none" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-none" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl text-grafito">Atracción</h1>
          <p className="cifra mt-1 text-[12px] text-cota">
            {abiertas.length} vacantes abiertas · {candidatosFlujo.length} candidatos en proceso
          </p>
        </div>
        <p className="cifra shrink-0 text-[11px] uppercase tracking-widest text-cota">Corte {hoy}</p>
      </header>

      <section aria-labelledby="ind-atraccion" className="space-y-3">
        <h2 id="ind-atraccion" className="text-[13px] font-semibold uppercase tracking-wide text-cota">
          Indicadores de cobertura
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <TarjetaIndicador
            titulo="Tiempo de cobertura promedio"
            valor={indicadores.cobertura}
            meta={45}
            min={0}
            max={Math.max(90, Math.ceil(indicadores.cobertura) + 10)}
            unidad=" días"
            decimales={1}
            sentido="menorEsMejor"
            etiquetaMeta="Meta"
            formula="Promedio de (fecha de cierre real − fecha de apertura) de vacantes cerradas"
            fuente={`Tabla vacantes (${cerradas.length} cerradas)`}
            fechaCorte={hoy}
          />
          <TarjetaIndicador
            titulo="Vacantes abiertas fuera de meta"
            valor={indicadores.fueraMeta}
            meta={0}
            min={0}
            max={Math.max(1, abiertas.length)}
            unidad=" vacantes"
            decimales={0}
            sentido="menorEsMejor"
            etiquetaMeta="Meta"
            formula="Vacantes abiertas cuyos días abierta superan su fecha meta de cobertura"
            fuente={`Tabla vacantes (${abiertas.length} abiertas)`}
            fechaCorte={hoy}
            nota={
              <p className="cifra text-[11px] text-cota">
                {numero(indicadores.pctFueraMeta, 1)}% de las vacantes abiertas
              </p>
            }
          />
          <TarjetaIndicador
            titulo="Costo de vacancia acumulado"
            valor={indicadores.costo}
            meta={0}
            min={0}
            max={Math.max(1, indicadores.costo)}
            unidad=" MXN"
            decimales={0}
            sentido="menorEsMejor"
            etiquetaMeta="Meta"
            formula="Suma de (días abierta × costo por día de vacancia) de las vacantes abiertas"
            fuente="Tabla vacantes · campo costo_vacante_dia capturado por vacante (no el supuesto global costo_vacante_dia)"
            fechaCorte={hoy}
            nota={
              indicadores.sinCosto > 0 ? (
                <p className="cifra border-l-2 border-casco bg-casco/10 px-2 py-1.5 text-[11px] text-grafito">
                  {indicadores.sinCosto} vacantes sin costo por día capturado: [Dato Requerido de Escala].
                </p>
              ) : (
                <p className="cifra text-[11px] text-cota">{pesos(indicadores.costo)} acumulados</p>
              )
            }
          />
        </div>
      </section>

      <Tabs defaultValue="vacantes" className="space-y-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
          <TabsList className="rounded-none">
            <TabsTrigger value="vacantes" className="rounded-none">
              Vacantes
            </TabsTrigger>
            <TabsTrigger value="flujo" className="rounded-none">
              Flujo
            </TabsTrigger>
          </TabsList>
          {puedeEditar && (
            <div className="flex shrink-0 gap-2">
              <Dialog open={abrirCandidato} onOpenChange={setAbrirCandidato}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="h-10 rounded-none">
                    <Plus className="mr-1 h-4 w-4" /> Registrar candidato
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-none">
                  <DialogHeader>
                    <DialogTitle>Registrar candidato</DialogTitle>
                  </DialogHeader>
                  <form
                    id="form-candidato"
                    onSubmit={(e) => {
                      e.preventDefault();
                      nuevoCandidato.mutate(new FormData(e.currentTarget));
                    }}
                    className="grid gap-3 sm:grid-cols-2"
                  >
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="c_nombre">Nombre completo</Label>
                      <Input id="c_nombre" name="nombre" required className="h-10 rounded-none" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="c_correo">Correo</Label>
                      <Input id="c_correo" name="correo" type="email" className="h-10 rounded-none" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="c_telefono">Teléfono</Label>
                      <Input id="c_telefono" name="telefono" className="h-10 rounded-none" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="c_vacante">Vacante</Label>
                      <SelectorBuscador
                        id="c_vacante"
                        ariaLabel="Vacante"
                        valor={vacanteCandidato}
                        onCambio={setVacanteCandidato}
                        opciones={[
                          { valor: "__ninguna", etiqueta: "Sin vacante" },
                          ...abiertas.map((v) => ({
                            valor: v.id,
                            etiqueta: `${nombrePuesto(v.puesto_id)} · ${nombreProyecto(v.proyecto_id)}`,
                          })),
                        ]}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="c_fuente">Fuente</Label>
                      <Select value={fuenteCandidato} onValueChange={setFuenteCandidato}>
                        <SelectTrigger id="c_fuente" className="h-10 rounded-none border-border text-[13px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-none">
                          {FUENTES.map((f) => (
                            <SelectItem key={f} value={f} className="rounded-none">
                              {f}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </form>
                  <DialogFooter>
                    <Button
                      form="form-candidato"
                      type="submit"
                      disabled={nuevoCandidato.isPending}
                      className="h-10 rounded-none"
                    >
                      Registrar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={abrirVacante} onOpenChange={setAbrirVacante}>
                <DialogTrigger asChild>
                  <Button className="h-10 rounded-none">
                    <Plus className="mr-1 h-4 w-4" /> Abrir vacante
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-none">
                  <DialogHeader>
                    <DialogTitle>Abrir vacante</DialogTitle>
                  </DialogHeader>
                  <form
                    id="form-vacante"
                    onSubmit={(e) => {
                      e.preventDefault();
                      nuevaVacante.mutate(new FormData(e.currentTarget));
                    }}
                    className="grid gap-3 sm:grid-cols-2"
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="v_puesto">Puesto</Label>
                      <SelectorBuscador
                        id="v_puesto"
                        ariaLabel="Puesto"
                        valor={puestoVacante}
                        onCambio={setPuestoVacante}
                        opciones={(data?.puestos ?? []).map((p) => ({ valor: p.id, etiqueta: p.nombre }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="v_proyecto">Proyecto</Label>
                      <SelectorBuscador
                        id="v_proyecto"
                        ariaLabel="Proyecto"
                        valor={proyectoVacante}
                        onCambio={setProyectoVacante}
                        opciones={[
                          { valor: "__corporativo", etiqueta: "Corporativo" },
                          ...(data?.proyectos ?? []).map((p) => ({ valor: p.id, etiqueta: p.nombre })),
                        ]}
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="v_hm">Hiring manager</Label>
                      <SelectorBuscador
                        id="v_hm"
                        ariaLabel="Hiring manager"
                        valor={hmVacante}
                        onCambio={setHmVacante}
                        opciones={[
                          { valor: "__ninguno", etiqueta: "Sin asignar" },
                          ...(data?.colaboradores ?? []).map((c) => ({ valor: c.id, etiqueta: c.nombre })),
                        ]}
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="v_motivo">Motivo</Label>
                      <Input id="v_motivo" name="motivo" className="h-10 rounded-none" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="v_min">Salario mínimo</Label>
                      <Input id="v_min" name="salario_min" type="number" min="0" className="h-10 rounded-none" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="v_max">Salario máximo</Label>
                      <Input id="v_max" name="salario_max" type="number" min="0" className="h-10 rounded-none" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="v_apertura">Fecha de apertura</Label>
                      <Input
                        id="v_apertura"
                        name="fecha_apertura"
                        type="date"
                        required
                        defaultValue={new Date().toISOString().slice(0, 10)}
                        className="h-10 rounded-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="v_meta">Fecha meta de cobertura</Label>
                      <Input id="v_meta" name="fecha_meta_cobertura" type="date" className="h-10 rounded-none" />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="v_costo">Costo por día de vacancia (MXN)</Label>
                      <Input id="v_costo" name="costo_vacante_dia" type="number" min="0" className="h-10 rounded-none" />
                    </div>
                  </form>
                  <DialogFooter>
                    <Button
                      form="form-vacante"
                      type="submit"
                      disabled={nuevaVacante.isPending}
                      className="h-10 rounded-none"
                    >
                      Abrir vacante
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        <TabsContent value="vacantes" className="space-y-4">
          <div className="grid gap-2 border border-border bg-card p-3 sm:grid-cols-3">
            <Input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Buscar por puesto"
              aria-label="Buscar vacante por puesto"
              className="h-10 rounded-none"
            />
            <SelectorBuscador
              ariaLabel="Filtrar por proyecto"
              valor={proyecto}
              onCambio={setProyecto}
              opciones={[
                { valor: "todos", etiqueta: "Todos los proyectos" },
                ...(data?.proyectos ?? []).map((p) => ({ valor: p.id, etiqueta: p.nombre })),
              ]}
            />
            <Select value={estatus} onValueChange={setEstatus}>
              <SelectTrigger aria-label="Filtrar por estatus" className="h-10 rounded-none border-border text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value="todos" className="rounded-none">Todos los estatus</SelectItem>
                <SelectItem value="abierta" className="rounded-none">Abiertas</SelectItem>
                <SelectItem value="cerrada" className="rounded-none">Cerradas</SelectItem>
                <SelectItem value="cancelada" className="rounded-none">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtradas.length === 0 ? (
            <div className="border border-dashed border-border bg-card p-8 text-center">
              <p className="text-[13px] text-cota">
                No hay vacantes con estos filtros. Ajusta la búsqueda o abre la primera vacante.
              </p>
            </div>
          ) : (
            <>
              {/* Tabla densa en escritorio */}
              <div className="hidden border border-border bg-card sm:block">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-grafito text-cal">
                    <tr>
                      {[
                        "Puesto",
                        "Proyecto",
                        "Hiring Manager",
                        "Apertura",
                        "Días abierta",
                        "Meta",
                        "Estatus",
                        "Candidatos activos",
                      ].map((h) => (
                        <th key={h} className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtradas.map((v) => {
                      const dias = diasAbierta(v);
                      return (
                        <tr key={v.id} className="fila-tabla border-t border-border">
                          <td className="h-10 px-3">
                            <Link
                              to="/atraccion/$id"
                              params={{ id: v.id }}
                              className="font-medium text-plomada underline-offset-4 hover:underline"
                            >
                              {nombrePuesto(v.puesto_id)}
                            </Link>
                          </td>
                          <td className="px-3">{nombreProyecto(v.proyecto_id)}</td>
                          <td className="px-3">{nombrePersona(v.hiring_manager_id)}</td>
                          <td className="cifra px-3">{fechaCorta(v.fecha_apertura)}</td>
                          <td
                            className={cn(
                              "cifra px-3 font-medium",
                              colorDiasAbierta(dias, v.fecha_apertura, v.fecha_meta_cobertura),
                            )}
                          >
                            {dias ?? "—"}
                          </td>
                          <td className="cifra px-3">{fechaCorta(v.fecha_meta_cobertura)}</td>
                          <td className="px-3 capitalize">{v.estatus}</td>
                          <td className="cifra px-3">{activosPorVacante(v.id)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Tarjetas apiladas en móvil */}
              <ul className="space-y-2 sm:hidden">
                {filtradas.map((v) => {
                  const dias = diasAbierta(v);
                  return (
                    <li key={v.id} className="border border-border bg-card p-3">
                      <Link
                        to="/atraccion/$id"
                        params={{ id: v.id }}
                        className="text-[14px] font-medium text-plomada underline-offset-4 hover:underline"
                      >
                        {nombrePuesto(v.puesto_id)}
                      </Link>
                      <p className="mt-0.5 text-[12px] text-cota">
                        {nombreProyecto(v.proyecto_id)} · {nombrePersona(v.hiring_manager_id)}
                      </p>
                      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px] text-cota">
                        <div className="flex justify-between gap-2">
                          <dt>Apertura</dt>
                          <dd className="cifra text-grafito">{fechaCorta(v.fecha_apertura)}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt>Meta</dt>
                          <dd className="cifra text-grafito">{fechaCorta(v.fecha_meta_cobertura)}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt>Días abierta</dt>
                          <dd
                            className={cn(
                              "cifra font-medium",
                              colorDiasAbierta(dias, v.fecha_apertura, v.fecha_meta_cobertura),
                            )}
                          >
                            {dias ?? "—"}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt>Candidatos</dt>
                          <dd className="cifra text-grafito">{activosPorVacante(v.id)}</dd>
                        </div>
                        <div className="col-span-2 flex justify-between gap-2">
                          <dt>Estatus</dt>
                          <dd className="capitalize text-grafito">{v.estatus}</dd>
                        </div>
                      </dl>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </TabsContent>

        <TabsContent value="flujo" className="space-y-3">
          {!puedeEditar && (
            <p className="border-l-2 border-casco bg-casco/10 px-2 py-1.5 text-[12px] text-grafito">
              Vista de solo lectura. Mover o descartar candidatos corresponde a Dirección de Talento y Reclutamiento.
            </p>
          )}
          {fases.length === 0 ? (
            <div className="border border-dashed border-border bg-card p-8 text-center">
              <p className="text-[13px] text-cota">
                Aún no hay fases del proceso configuradas. Defínelas en Configuración para usar el tablero.
              </p>
            </div>
          ) : (
            <TableroFlujo
              fases={fases}
              candidatos={candidatosFlujo}
              puedeMover={puedeEditar}
              onMover={(candidato, fase) => mover.mutate({ candidato, fase })}
              onDescartar={(candidato, motivo) => descartar.mutate({ id: candidato.id, motivo })}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}