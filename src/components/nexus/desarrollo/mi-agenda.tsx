import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BandaLineaBase } from "@/components/nexus/banda-linea-base";
import { SelectorBuscador } from "@/components/nexus/selector-buscador";
import { fechaCorta, numero } from "@/lib/nexus/formato";
import { leerPerfil } from "@/lib/nexus/desempeno";
import {
  AVISO_AUTORIZACION,
  AVISO_AUTORREFLEXION,
  avanceAgenda,
  bloqueosAutorizacion,
  CICLO_ACTUAL,
  DIMENSIONES,
  ESTATUS_ACCION,
  ETIQUETA_ESTATUS_ACCION,
  ETIQUETA_ESTATUS_AGENDA,
  ETIQUETA_VIA,
  MAX_PRIORIDADES,
  mezclaAprendizaje,
  TIPOS_SESION,
  VIAS,
} from "@/lib/nexus/desarrollo";
import { cn } from "@/lib/utils";

interface Props {
  colaboradorId: string | null;
  miColaboradorId: string | null;
  esTalento: boolean;
  ciclo?: string;
}

interface Autorreflexion {
  grado: string;
  institucion: string;
  ultimoCurso: string;
  movilidadDisponible: boolean;
  movilidadCiudades: string;
  horizonte12: string;
  horizonte36: string;
  puestoDeseado: string;
  fortalezas: string;
  areas: string;
  necesidadesActual: string;
  necesidadesFuturo: string;
}

const AUTORREFLEXION_VACIA: Autorreflexion = {
  grado: "",
  institucion: "",
  ultimoCurso: "",
  movilidadDisponible: false,
  movilidadCiudades: "",
  horizonte12: "",
  horizonte36: "",
  puestoDeseado: "",
  fortalezas: "",
  areas: "",
  necesidadesActual: "",
  necesidadesFuturo: "",
};

const texto = (v: unknown) => (typeof v === "string" ? v : "");
const objeto = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const lista = (v: unknown) => (Array.isArray(v) ? v.map(String).join("\n") : "");
const aLista = (v: string) =>
  v
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

const ACCION_VACIA = {
  prioridad_id: "",
  descripcion: "",
  via_aprendizaje: "experiencia",
  tipo_accion: "",
  monto_inversion: "",
  medicion_exito: "",
  fecha_inicio: "",
  fecha_fin: "",
  estatus: "planeada",
};

function Titulo({ children, nota }: { children: string; nota?: string }) {
  return (
    <header className="border-b border-border pb-2">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-cota">{children}</h2>
      {nota ? <p className="mt-1 text-[13px] text-cota">{nota}</p> : null}
    </header>
  );
}

/** Agenda de desarrollo de una persona: autorreflexión, prioridades, acciones, seguimiento y efectividad. */
export function MiAgenda({
  colaboradorId,
  miColaboradorId,
  esTalento,
  ciclo = CICLO_ACTUAL,
}: Props) {
  const queryClient = useQueryClient();
  const [reflexion, setReflexion] = useState<Autorreflexion>(AUTORREFLEXION_VACIA);
  const [reflexionCargada, setReflexionCargada] = useState<string | null>(null);
  const [nuevaPrioridad, setNuevaPrioridad] = useState({
    dimension: "Gestión",
    competencia_id: "",
    descripcion: "",
    nivel_actual: "",
    nivel_meta: "",
  });
  const [accion, setAccion] = useState(ACCION_VACIA);
  const [accionAbierta, setAccionAbierta] = useState(false);
  const [sesion, setSesion] = useState({ fecha: "", tipo: "seguimiento", acuerdos: "" });

  const clave = ["agenda-desarrollo", colaboradorId, ciclo];

  const { data, isLoading } = useQuery({
    queryKey: clave,
    enabled: !!colaboradorId,
    retry: 2,
    queryFn: async () => {
      const id = colaboradorId as string;
      const [{ data: colaborador }, { data: agenda }, { data: competencias }] = await Promise.all([
        supabase
          .from("colaboradores")
          .select("id, nombre, area, puesto_id, lider_id")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("agendas_desarrollo")
          .select("*")
          .eq("colaborador_id", id)
          .eq("ciclo", ciclo)
          .maybeSingle(),
        supabase.from("competencias").select("id, nombre, grupo").order("orden"),
      ]);

      let autorreflexion = null;
      let prioridades: {
        id: string;
        agenda_id: string;
        dimension: string | null;
        competencia_id: string | null;
        descripcion: string | null;
        nivel_actual: number | null;
        nivel_meta: number | null;
      }[] = [];
      let acciones: {
        id: string;
        prioridad_id: string;
        descripcion: string | null;
        via_aprendizaje: string | null;
        tipo_accion: string | null;
        monto_inversion: number | null;
        medicion_exito: string | null;
        fecha_inicio: string | null;
        fecha_fin: string | null;
        estatus: string;
      }[] = [];
      let sesiones: {
        id: string;
        fecha: string | null;
        tipo: string | null;
        acuerdos: string | null;
      }[] = [];
      let mediciones: {
        id: string;
        prioridad_id: string;
        autoevaluacion: boolean | null;
        evaluacion_jefe: boolean | null;
        comentarios: string | null;
        fecha: string | null;
      }[] = [];

      if (agenda) {
        const [ar, pr, se] = await Promise.all([
          supabase.from("autorreflexion").select("*").eq("agenda_id", agenda.id).maybeSingle(),
          supabase.from("prioridades_desarrollo").select("*").eq("agenda_id", agenda.id),
          supabase
            .from("sesiones_seguimiento")
            .select("id, fecha, tipo, acuerdos")
            .eq("agenda_id", agenda.id)
            .order("fecha", { ascending: false }),
        ]);
        autorreflexion = ar.data;
        prioridades = pr.data ?? [];
        sesiones = se.data ?? [];
        const ids = prioridades.map((p) => p.id);
        if (ids.length > 0) {
          const [ac, me] = await Promise.all([
            supabase.from("acciones_desarrollo").select("*").in("prioridad_id", ids),
            supabase.from("medicion_efectividad").select("*").in("prioridad_id", ids),
          ]);
          acciones = ac.data ?? [];
          mediciones = me.data ?? [];
        }
      }

      // Brechas del módulo Desempeño para precargar prioridades.
      const brechas: { competenciaId: string; nombre: string; observado: number; meta: number }[] =
        [];
      if (colaborador?.puesto_id) {
        const [{ data: puesto }, { data: evaluacion }] = await Promise.all([
          supabase
            .from("puestos")
            .select("perfil_competencias")
            .eq("id", colaborador.puesto_id)
            .maybeSingle(),
          supabase
            .from("evaluaciones")
            .select("id")
            .eq("colaborador_id", id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);
        const perfil = leerPerfil(puesto?.perfil_competencias ?? null);
        if (perfil.validado && evaluacion) {
          const { data: filas } = await supabase
            .from("evaluacion_competencias")
            .select("competencia_id, nivel_observado")
            .eq("evaluacion_id", evaluacion.id);
          for (const f of filas ?? []) {
            const meta = f.competencia_id ? perfil.niveles[f.competencia_id] : undefined;
            if (!f.competencia_id || meta === undefined || typeof f.nivel_observado !== "number")
              continue;
            if (f.nivel_observado >= meta) continue;
            brechas.push({
              competenciaId: f.competencia_id,
              nombre:
                (competencias ?? []).find((c) => c.id === f.competencia_id)?.nombre ??
                "Competencia",
              observado: f.nivel_observado,
              meta,
            });
          }
          brechas.sort((a, b) => a.observado - a.meta - (b.observado - b.meta));
        }
      }

      return {
        colaborador,
        agenda,
        autorreflexion,
        prioridades,
        acciones,
        sesiones,
        mediciones,
        competencias: competencias ?? [],
        brechas,
      };
    },
  });

  const agenda = data?.agenda ?? null;
  const prioridades = data?.prioridades ?? [];
  const acciones = data?.acciones ?? [];
  const esPropia = !!colaboradorId && colaboradorId === miColaboradorId;
  const esLider = !!miColaboradorId && data?.colaborador?.lider_id === miColaboradorId;
  const autorizada = agenda?.estatus === "autorizada";
  const puedeEditar = esTalento || esLider || (esPropia && !autorizada);
  const bloqueos = bloqueosAutorizacion(prioridades, acciones);
  const avance = avanceAgenda(acciones);
  const mezcla = mezclaAprendizaje(acciones.filter((a) => a.estatus !== "cancelada"));

  useEffect(() => {
    if (!agenda) return;
    if (reflexionCargada === agenda.id) return;
    const r = data?.autorreflexion;
    const formacion = objeto(r?.formacion);
    const movilidad = objeto(r?.movilidad);
    const carrera = objeto(r?.expectativas_carrera);
    setReflexion({
      grado: texto(formacion["grado"]),
      institucion: texto(formacion["institucion"]),
      ultimoCurso: texto(formacion["ultimo_curso"]),
      movilidadDisponible: movilidad["disponible"] === true,
      movilidadCiudades: texto(movilidad["ciudades"]),
      horizonte12: texto(carrera["horizonte_12m"]),
      horizonte36: texto(carrera["horizonte_36m"]),
      puestoDeseado: texto(carrera["puesto_deseado"]),
      fortalezas: lista(r?.fortalezas),
      areas: lista(r?.areas_oportunidad),
      necesidadesActual: lista(r?.necesidades_actual),
      necesidadesFuturo: lista(r?.necesidades_futuro),
    });
    setReflexionCargada(agenda.id);
  }, [agenda, data?.autorreflexion, reflexionCargada]);

  const refrescar = () => {
    queryClient.invalidateQueries({ queryKey: ["agenda-desarrollo"] });
    queryClient.invalidateQueries({ queryKey: ["desarrollo-agendas-equipo"] });
    queryClient.invalidateQueries({ queryKey: ["desarrollo-indicadores"] });
  };

  const fallo = (mensaje: string) => () => toast.error(mensaje);

  const crearAgenda = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("agendas_desarrollo").insert({
        colaborador_id: colaboradorId,
        ciclo,
        estatus: "borrador",
        avance_pct: 0,
        es_demo: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agenda abierta en borrador");
      refrescar();
    },
    onError: fallo("No se abrió la agenda. Solo el propio colaborador, su líder o Talento pueden."),
  });

  const guardarReflexion = useMutation({
    mutationFn: async () => {
      if (!agenda) throw new Error("sin agenda");
      const fila = {
        agenda_id: agenda.id,
        formacion: {
          grado: reflexion.grado,
          institucion: reflexion.institucion,
          ultimo_curso: reflexion.ultimoCurso,
        } as never,
        movilidad: {
          disponible: reflexion.movilidadDisponible,
          ciudades: reflexion.movilidadCiudades,
        } as never,
        expectativas_carrera: {
          horizonte_12m: reflexion.horizonte12,
          horizonte_36m: reflexion.horizonte36,
          puesto_deseado: reflexion.puestoDeseado,
        } as never,
        fortalezas: aLista(reflexion.fortalezas),
        areas_oportunidad: aLista(reflexion.areas),
        necesidades_actual: aLista(reflexion.necesidadesActual),
        necesidades_futuro: aLista(reflexion.necesidadesFuturo),
        es_demo: false,
      };
      const existente = data?.autorreflexion;
      const { error } = existente
        ? await supabase.from("autorreflexion").update(fila).eq("id", existente.id)
        : await supabase.from("autorreflexion").insert(fila);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Autorreflexión guardada");
      refrescar();
    },
    onError: fallo("No se guardó la autorreflexión."),
  });

  const agregarPrioridad = useMutation({
    mutationFn: async (fila?: {
      competencia_id: string;
      descripcion: string;
      nivel_actual: number;
      nivel_meta: number;
      dimension: string;
    }) => {
      if (!agenda) throw new Error("sin agenda");
      if (prioridades.length >= MAX_PRIORIDADES) throw new Error("maximo");
      const p = fila ?? {
        competencia_id: nuevaPrioridad.competencia_id || "",
        descripcion: nuevaPrioridad.descripcion.trim(),
        nivel_actual: Number(nuevaPrioridad.nivel_actual) || 0,
        nivel_meta: Number(nuevaPrioridad.nivel_meta) || 0,
        dimension: nuevaPrioridad.dimension,
      };
      if (p.descripcion === "") throw new Error("descripcion");
      const { error } = await supabase.from("prioridades_desarrollo").insert({
        agenda_id: agenda.id,
        dimension: p.dimension,
        competencia_id: p.competencia_id || null,
        descripcion: p.descripcion,
        nivel_actual: p.nivel_actual || null,
        nivel_meta: p.nivel_meta || null,
        es_demo: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prioridad agregada");
      setNuevaPrioridad({
        dimension: "Gestión",
        competencia_id: "",
        descripcion: "",
        nivel_actual: "",
        nivel_meta: "",
      });
      refrescar();
    },
    onError: (e: Error) =>
      toast.error(
        e.message === "maximo"
          ? `Máximo ${MAX_PRIORIDADES} prioridades. Con más de tres no se avanza en ninguna.`
          : e.message === "descripcion"
            ? "Escribe qué se va a desarrollar."
            : "No se agregó la prioridad.",
      ),
  });

  const borrarPrioridad = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prioridades_desarrollo").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prioridad eliminada");
      refrescar();
    },
    onError: fallo("No se eliminó la prioridad."),
  });

  const guardarAccion = useMutation({
    mutationFn: async () => {
      if (!accion.prioridad_id) throw new Error("prioridad");
      if (accion.descripcion.trim() === "") throw new Error("descripcion");
      if (accion.medicion_exito.trim() === "") throw new Error("medicion");
      const { error } = await supabase.from("acciones_desarrollo").insert({
        prioridad_id: accion.prioridad_id,
        descripcion: accion.descripcion.trim(),
        via_aprendizaje: accion.via_aprendizaje,
        tipo_accion: accion.tipo_accion || null,
        monto_inversion: accion.monto_inversion === "" ? null : Number(accion.monto_inversion),
        medicion_exito: accion.medicion_exito.trim(),
        fecha_inicio: accion.fecha_inicio || null,
        fecha_fin: accion.fecha_fin || null,
        estatus: accion.estatus,
        es_demo: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Acción registrada");
      setAccion(ACCION_VACIA);
      setAccionAbierta(false);
      refrescar();
    },
    onError: (e: Error) =>
      toast.error(
        e.message === "medicion"
          ? "Sin medición de éxito no se registra la acción: es lo que permite saber si sirvió."
          : e.message === "descripcion"
            ? "Describe la acción."
            : e.message === "prioridad"
              ? "Elige la prioridad a la que responde."
              : "No se registró la acción.",
      ),
  });

  const cambiarEstatusAccion = useMutation({
    mutationFn: async ({ id, estatus }: { id: string; estatus: string }) => {
      const { error } = await supabase
        .from("acciones_desarrollo")
        .update({ estatus, ultima_actualizacion: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      const nuevas = acciones.map((a) => (a.id === id ? { ...a, estatus } : a));
      const pct = avanceAgenda(nuevas);
      if (agenda && pct !== null) {
        await supabase
          .from("agendas_desarrollo")
          .update({ avance_pct: Number(pct.toFixed(1)) })
          .eq("id", agenda.id);
      }
    },
    onSuccess: () => {
      toast.success("Acción actualizada");
      refrescar();
    },
    onError: fallo("No se actualizó la acción."),
  });

  const agregarSesion = useMutation({
    mutationFn: async () => {
      if (!agenda) throw new Error("sin agenda");
      if (sesion.acuerdos.trim().length < 20) throw new Error("acuerdos");
      const { error } = await supabase.from("sesiones_seguimiento").insert({
        agenda_id: agenda.id,
        fecha: sesion.fecha || new Date().toISOString().slice(0, 10),
        tipo: sesion.tipo,
        acuerdos: sesion.acuerdos.trim(),
        es_demo: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sesión registrada");
      setSesion({ fecha: "", tipo: "seguimiento", acuerdos: "" });
      refrescar();
    },
    onError: (e: Error) =>
      toast.error(
        e.message === "acuerdos"
          ? "Una sesión sin acuerdos escritos no deja rastro. Escribe al menos 20 caracteres."
          : "No se registró la sesión.",
      ),
  });

  const guardarMedicion = useMutation({
    mutationFn: async ({
      prioridadId,
      autoevaluacion,
      evaluacionJefe,
      comentarios,
    }: {
      prioridadId: string;
      autoevaluacion: boolean;
      evaluacionJefe: boolean;
      comentarios: string;
    }) => {
      const existente = (data?.mediciones ?? []).find((m) => m.prioridad_id === prioridadId);
      const fila = {
        prioridad_id: prioridadId,
        autoevaluacion,
        evaluacion_jefe: evaluacionJefe,
        comentarios: comentarios.trim() || null,
        fecha: new Date().toISOString().slice(0, 10),
        es_demo: false,
      };
      const { error } = existente
        ? await supabase.from("medicion_efectividad").update(fila).eq("id", existente.id)
        : await supabase.from("medicion_efectividad").insert(fila);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Medición de efectividad guardada");
      refrescar();
    },
    onError: fallo("No se guardó la medición."),
  });

  const cambiarFlujo = useMutation({
    mutationFn: async (accionFlujo: "revision" | "vb_lider" | "autorizar" | "reabrir") => {
      if (!agenda) throw new Error("sin agenda");
      if (accionFlujo === "autorizar" && bloqueos.length > 0) throw new Error("bloqueos");
      const ahora = new Date().toISOString();
      const cambios =
        accionFlujo === "revision"
          ? { estatus: "revision" }
          : accionFlujo === "vb_lider"
            ? { estatus: "revision", vb_lider_en: ahora, vb_lider_por: miColaboradorId }
            : accionFlujo === "autorizar"
              ? {
                  estatus: "autorizada",
                  vb_talento_en: ahora,
                  fecha_autorizacion: ahora.slice(0, 10),
                }
              : {
                  estatus: "borrador",
                  fecha_autorizacion: null,
                  vb_talento_en: null,
                  vb_lider_en: null,
                };
      const { error } = await supabase
        .from("agendas_desarrollo")
        .update(cambios)
        .eq("id", agenda.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Estatus de la agenda actualizado");
      refrescar();
    },
    onError: (e: Error) =>
      toast.error(
        e.message === "bloqueos"
          ? AVISO_AUTORIZACION
          : "No se cambió el estatus. Revisa tus permisos sobre esta agenda.",
      ),
  });

  const opcionesCompetencia = useMemo(
    () =>
      (data?.competencias ?? []).map((c) => ({
        valor: c.id,
        etiqueta: c.nombre,
        detalle: c.grupo ?? undefined,
      })),
    [data?.competencias],
  );

  if (!colaboradorId) {
    return (
      <p className="border border-dashed border-border p-6 text-center text-[13px] text-cota">
        Tu usuario todavía no está vinculado a un expediente de colaborador. Pide a Dirección de
        Talento que lo vincule en{" "}
        <Link to="/configuracion" className="underline">
          Configuración › Usuarios y accesos
        </Link>
        .
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-none" />
        <Skeleton className="h-64 w-full rounded-none" />
        <Skeleton className="h-48 w-full rounded-none" />
      </div>
    );
  }

  if (!agenda) {
    return (
      <div className="border border-dashed border-border bg-card p-8 text-center">
        <h2 className="text-lg text-grafito">
          {data?.colaborador?.nombre ?? "Esta persona"} no tiene agenda del ciclo {ciclo}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-[13px] text-cota">
          Desempeño mide la brecha; Desarrollo la cierra. Abre la agenda para registrar la
          autorreflexión, hasta {MAX_PRIORIDADES} prioridades y las acciones que las cierran.
        </p>
        <Button
          disabled={crearAgenda.isPending}
          onClick={() => crearAgenda.mutate()}
          className="mt-4 h-10 rounded-none text-[12px]"
        >
          Abrir agenda {ciclo}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Encabezado y flujo de autorización */}
      <section className="border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg text-grafito">
              {data?.colaborador?.nombre ?? "Agenda de desarrollo"}
            </h2>
            <p className="cifra mt-1 text-[11px] uppercase tracking-wide text-cota">
              Ciclo {ciclo} · {ETIQUETA_ESTATUS_AGENDA[agenda.estatus] ?? agenda.estatus} ·{" "}
              {prioridades.length} de {MAX_PRIORIDADES} prioridades
            </p>
            <p className="cifra mt-1 text-[11px] text-cota">
              VB líder {agenda.vb_lider_en ? fechaCorta(agenda.vb_lider_en) : "pendiente"} · VB
              Talento {agenda.vb_talento_en ? fechaCorta(agenda.vb_talento_en) : "pendiente"}
            </p>
          </div>
          <div className="w-full max-w-xs">
            {avance === null ? (
              <p className="text-[12px] text-cota">Sin acciones: el avance no es calculable.</p>
            ) : (
              <BandaLineaBase
                valor={avance}
                meta={80}
                min={0}
                max={100}
                unidad="%"
                decimales={0}
                etiquetaMeta="Línea base"
              />
            )}
          </div>
        </div>

        {bloqueos.length > 0 ? (
          <div className="mt-3 border-l-2 border-desviacion bg-desviacion/5 px-3 py-2">
            <p className="text-[13px] text-grafito">{AVISO_AUTORIZACION}</p>
            <ul className="mt-1 space-y-0.5 text-[12px] text-cota">
              {bloqueos.map((b) => (
                <li key={b}>· {b}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          {esPropia && agenda.estatus === "borrador" ? (
            <Button
              variant="outline"
              onClick={() => cambiarFlujo.mutate("revision")}
              className="h-10 rounded-none text-[12px]"
            >
              Enviar a revisión del líder
            </Button>
          ) : null}
          {esLider && agenda.estatus !== "autorizada" ? (
            <Button
              variant="outline"
              onClick={() => cambiarFlujo.mutate("vb_lider")}
              className="h-10 rounded-none text-[12px]"
            >
              Dar visto bueno como líder
            </Button>
          ) : null}
          {esTalento && agenda.estatus !== "autorizada" ? (
            <Button
              disabled={bloqueos.length > 0}
              onClick={() => cambiarFlujo.mutate("autorizar")}
              className="h-10 rounded-none text-[12px]"
            >
              Autorizar agenda
            </Button>
          ) : null}
          {esTalento && agenda.estatus === "autorizada" ? (
            <Button
              variant="outline"
              onClick={() => cambiarFlujo.mutate("reabrir")}
              className="h-10 rounded-none text-[12px]"
            >
              Reabrir agenda
            </Button>
          ) : null}
        </div>
      </section>

      {/* Autorreflexión */}
      <section className="space-y-3 border border-border bg-card p-4">
        <Titulo nota={AVISO_AUTORREFLEXION}>Autorreflexión</Titulo>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="ar-grado">Grado máximo de estudios</Label>
            <Input
              id="ar-grado"
              disabled={!puedeEditar}
              value={reflexion.grado}
              onChange={(e) => setReflexion((r) => ({ ...r, grado: e.target.value }))}
              className="h-10 rounded-none text-[13px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ar-institucion">Institución</Label>
            <Input
              id="ar-institucion"
              disabled={!puedeEditar}
              value={reflexion.institucion}
              onChange={(e) => setReflexion((r) => ({ ...r, institucion: e.target.value }))}
              className="h-10 rounded-none text-[13px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ar-curso">Última formación relevante</Label>
            <Input
              id="ar-curso"
              disabled={!puedeEditar}
              value={reflexion.ultimoCurso}
              onChange={(e) => setReflexion((r) => ({ ...r, ultimoCurso: e.target.value }))}
              className="h-10 rounded-none text-[13px]"
            />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="ar-movilidad"
                disabled={!puedeEditar}
                checked={reflexion.movilidadDisponible}
                onCheckedChange={(v) =>
                  setReflexion((r) => ({ ...r, movilidadDisponible: v === true }))
                }
              />
              <Label htmlFor="ar-movilidad" className="text-[13px] text-cota">
                Disponible para cambiar de obra o de ciudad
              </Label>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ar-ciudades">Ciudades o regiones</Label>
              <Input
                id="ar-ciudades"
                disabled={!puedeEditar || !reflexion.movilidadDisponible}
                value={reflexion.movilidadCiudades}
                onChange={(e) => setReflexion((r) => ({ ...r, movilidadCiudades: e.target.value }))}
                className="h-10 rounded-none text-[13px]"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ar-puesto">Puesto al que aspira</Label>
            <Input
              id="ar-puesto"
              disabled={!puedeEditar}
              value={reflexion.puestoDeseado}
              onChange={(e) => setReflexion((r) => ({ ...r, puestoDeseado: e.target.value }))}
              className="h-10 rounded-none text-[13px]"
            />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {(
            [
              ["horizonte12", "Qué quiere lograr en 12 meses"],
              ["horizonte36", "Qué quiere lograr en 36 meses"],
              ["fortalezas", "Fortalezas (una por línea)"],
              ["areas", "Áreas de oportunidad (una por línea)"],
              ["necesidadesActual", "Necesidades para el puesto actual"],
              ["necesidadesFuturo", "Necesidades para el puesto futuro"],
            ] as const
          ).map(([campo, etiqueta]) => (
            <div key={campo} className="space-y-1.5">
              <Label htmlFor={`ar-${campo}`}>{etiqueta}</Label>
              <Textarea
                id={`ar-${campo}`}
                rows={3}
                disabled={!puedeEditar}
                value={reflexion[campo]}
                onChange={(e) => setReflexion((r) => ({ ...r, [campo]: e.target.value }))}
                className="rounded-none text-[13px]"
              />
            </div>
          ))}
        </div>
        {puedeEditar ? (
          <Button
            disabled={guardarReflexion.isPending}
            onClick={() => guardarReflexion.mutate()}
            className="h-10 rounded-none text-[12px]"
          >
            Guardar autorreflexión
          </Button>
        ) : null}
      </section>

      {/* Prioridades */}
      <section className="space-y-3 border border-border bg-card p-4">
        <Titulo
          nota={`Máximo ${MAX_PRIORIDADES} prioridades por ciclo. Con más de tres no se avanza en ninguna.`}
        >
          Prioridades de desarrollo
        </Titulo>

        {(data?.brechas ?? []).length > 0 && puedeEditar ? (
          <div className="border-l-2 border-casco bg-casco/10 px-3 py-2">
            <p className="text-[13px] text-grafito">
              Brechas detectadas en Desempeño. Cada una se puede convertir en prioridad con un clic.
            </p>
            <ul className="mt-2 space-y-1">
              {(data?.brechas ?? []).slice(0, 5).map((b) => (
                <li key={b.competenciaId} className="flex flex-wrap items-center gap-2 text-[13px]">
                  <span className="text-grafito">{b.nombre}</span>
                  <span className="cifra text-[11px] text-cota">
                    observado {b.observado} · meta {b.meta}
                  </span>
                  <Button
                    variant="outline"
                    disabled={prioridades.length >= MAX_PRIORIDADES}
                    onClick={() =>
                      agregarPrioridad.mutate({
                        competencia_id: b.competenciaId,
                        descripcion: `Cerrar la brecha de ${b.nombre}: pasar de nivel ${b.observado} a ${b.meta}`,
                        nivel_actual: b.observado,
                        nivel_meta: b.meta,
                        dimension: "Gestión",
                      })
                    }
                    className="ml-auto h-9 rounded-none text-[12px]"
                  >
                    Convertir en prioridad
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {prioridades.length === 0 ? (
          <p className="border border-dashed border-border p-4 text-center text-[13px] text-cota">
            Sin prioridades todavía.
          </p>
        ) : (
          <ul className="space-y-2">
            {prioridades.map((p) => {
              const suyas = acciones.filter((a) => a.prioridad_id === p.id);
              return (
                <li key={p.id} className="border border-border bg-background p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] text-grafito">{p.descripcion}</p>
                      <p className="cifra mt-1 text-[11px] uppercase tracking-wide text-cota">
                        {p.dimension ?? "Sin dimensión"} ·{" "}
                        {(data?.competencias ?? []).find((c) => c.id === p.competencia_id)
                          ?.nombre ?? "Sin competencia ligada"}{" "}
                        · nivel {p.nivel_actual ?? "—"} a {p.nivel_meta ?? "—"} · {suyas.length}{" "}
                        acciones
                      </p>
                    </div>
                    {puedeEditar ? (
                      <Button
                        variant="ghost"
                        aria-label="Eliminar prioridad"
                        onClick={() => borrarPrioridad.mutate(p.id)}
                        className="h-10 w-10 shrink-0 rounded-none p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {puedeEditar && prioridades.length < MAX_PRIORIDADES ? (
          <div className="space-y-3 border-t border-border pt-3">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="pr-dimension">Dimensión</Label>
                <Select
                  value={nuevaPrioridad.dimension}
                  onValueChange={(v) => setNuevaPrioridad((p) => ({ ...p, dimension: v }))}
                >
                  <SelectTrigger id="pr-dimension" className="h-10 rounded-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
                    {DIMENSIONES.map((d) => (
                      <SelectItem key={d} value={d} className="rounded-none">
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="pr-competencia">Competencia</Label>
                <SelectorBuscador
                  id="pr-competencia"
                  ariaLabel="Competencia de la prioridad"
                  opciones={opcionesCompetencia}
                  valor={nuevaPrioridad.competencia_id}
                  onCambio={(v) => setNuevaPrioridad((p) => ({ ...p, competencia_id: v }))}
                  placeholder="Sin competencia"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pr-actual">Nivel actual</Label>
                  <Input
                    id="pr-actual"
                    inputMode="numeric"
                    value={nuevaPrioridad.nivel_actual}
                    onChange={(e) =>
                      setNuevaPrioridad((p) => ({ ...p, nivel_actual: e.target.value }))
                    }
                    className="cifra h-10 rounded-none text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pr-meta">Nivel meta</Label>
                  <Input
                    id="pr-meta"
                    inputMode="numeric"
                    value={nuevaPrioridad.nivel_meta}
                    onChange={(e) =>
                      setNuevaPrioridad((p) => ({ ...p, nivel_meta: e.target.value }))
                    }
                    className="cifra h-10 rounded-none text-[13px]"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr-descripcion">Qué se va a desarrollar</Label>
              <Textarea
                id="pr-descripcion"
                rows={2}
                value={nuevaPrioridad.descripcion}
                onChange={(e) => setNuevaPrioridad((p) => ({ ...p, descripcion: e.target.value }))}
                className="rounded-none text-[13px]"
              />
            </div>
            <Button
              disabled={agregarPrioridad.isPending}
              onClick={() => agregarPrioridad.mutate(undefined)}
              className="h-10 rounded-none text-[12px]"
            >
              Agregar prioridad
            </Button>
          </div>
        ) : null}
      </section>

      {/* Acciones 70-20-10 */}
      <section className="space-y-3 border border-border bg-card p-4">
        <Titulo nota="El desarrollo ocurre 70 % haciendo, 20 % con otros y 10 % en el aula. La mezcla real de esta agenda se compara contra esa referencia.">
          Acciones de desarrollo
        </Titulo>

        <div className="grid gap-4 md:grid-cols-3">
          {mezcla.map((v) => (
            <div key={v.clave} className="border border-border bg-background p-3">
              <h3 className="text-[13px] font-semibold text-grafito">
                {v.etiqueta}
                <span className="cifra ml-2 text-[11px] text-cota">referencia {v.pct} %</span>
              </h3>
              <p className="cifra mt-1 text-[24px] leading-none text-grafito">
                {numero(v.real, 0)}
                <span className="ml-1 text-sm text-cota">%</span>
              </p>
              <div className="mt-2">
                <BandaLineaBase
                  valor={v.real}
                  meta={v.pct}
                  min={0}
                  max={100}
                  unidad="%"
                  decimales={0}
                  etiquetaMeta="Referencia"
                />
              </div>
              <p className="mt-2 text-[12px] leading-snug text-cota">{v.ayuda}</p>
            </div>
          ))}
        </div>

        {acciones.length === 0 ? (
          <p className="border border-dashed border-border p-4 text-center text-[13px] text-cota">
            Sin acciones registradas. Una prioridad sin acciones es una intención.
          </p>
        ) : (
          <div className="overflow-x-auto border border-border">
            <table className="w-full min-w-[860px] text-left text-[13px]">
              <thead className="bg-grafito text-cal">
                <tr>
                  {["Acción", "Vía", "Medición de éxito", "Periodo", "Inversión", "Estatus"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {acciones.map((a) => (
                  <tr
                    key={a.id}
                    className="border-t border-border transition-colors hover:bg-muted"
                  >
                    <td className="px-3 py-2 text-grafito">{a.descripcion}</td>
                    <td className="px-3 py-2 text-cota">
                      {ETIQUETA_VIA[a.via_aprendizaje ?? ""] ?? "—"}
                      {a.tipo_accion ? (
                        <span className="block text-[11px]">{a.tipo_accion}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-cota">{a.medicion_exito ?? "—"}</td>
                    <td className="cifra px-3 py-2 text-cota">
                      {fechaCorta(a.fecha_inicio)} — {fechaCorta(a.fecha_fin)}
                    </td>
                    <td className="cifra px-3 py-2 text-grafito">
                      {a.monto_inversion ? numero(a.monto_inversion, 0) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {puedeEditar ? (
                        <Select
                          value={a.estatus}
                          onValueChange={(v) =>
                            cambiarEstatusAccion.mutate({ id: a.id, estatus: v })
                          }
                        >
                          <SelectTrigger
                            aria-label={`Estatus de ${a.descripcion ?? "la acción"}`}
                            className="h-9 w-36 rounded-none"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-none">
                            {ESTATUS_ACCION.map((e) => (
                              <SelectItem key={e} value={e} className="rounded-none">
                                {ETIQUETA_ESTATUS_ACCION[e]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-cota">{ETIQUETA_ESTATUS_ACCION[a.estatus]}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {puedeEditar && prioridades.length > 0 ? (
          <Dialog open={accionAbierta} onOpenChange={setAccionAbierta}>
            <Button
              onClick={() => setAccionAbierta(true)}
              className="h-10 rounded-none text-[12px]"
            >
              Registrar acción
            </Button>
            <DialogContent className="max-h-[90vh] overflow-y-auto rounded-none">
              <DialogHeader>
                <DialogTitle>Registrar acción de desarrollo</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ac-prioridad">Prioridad que atiende</Label>
                  <SelectorBuscador
                    id="ac-prioridad"
                    ariaLabel="Prioridad de la acción"
                    opciones={prioridades.map((p) => ({
                      valor: p.id,
                      etiqueta: p.descripcion ?? "Prioridad sin descripción",
                      detalle: p.dimension ?? undefined,
                    }))}
                    valor={accion.prioridad_id}
                    onCambio={(v) => setAccion((a) => ({ ...a, prioridad_id: v }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ac-descripcion">Acción</Label>
                  <Textarea
                    id="ac-descripcion"
                    rows={2}
                    value={accion.descripcion}
                    onChange={(e) => setAccion((a) => ({ ...a, descripcion: e.target.value }))}
                    className="rounded-none text-[13px]"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="ac-via">Vía de aprendizaje</Label>
                    <Select
                      value={accion.via_aprendizaje}
                      onValueChange={(v) =>
                        setAccion((a) => ({ ...a, via_aprendizaje: v, tipo_accion: "" }))
                      }
                    >
                      <SelectTrigger id="ac-via" className="h-10 rounded-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-none">
                        {VIAS.map((v) => (
                          <SelectItem key={v.clave} value={v.clave} className="rounded-none">
                            {v.etiqueta} · {v.pct} %
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ac-tipo">Tipo de acción</Label>
                    <Select
                      value={accion.tipo_accion}
                      onValueChange={(v) => setAccion((a) => ({ ...a, tipo_accion: v }))}
                    >
                      <SelectTrigger id="ac-tipo" className="h-10 rounded-none">
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent className="rounded-none">
                        {(VIAS.find((v) => v.clave === accion.via_aprendizaje)?.tipos ?? []).map(
                          (t) => (
                            <SelectItem key={t} value={t} className="rounded-none">
                              {t}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ac-medicion">Medición de éxito</Label>
                  <Textarea
                    id="ac-medicion"
                    rows={2}
                    value={accion.medicion_exito}
                    onChange={(e) => setAccion((a) => ({ ...a, medicion_exito: e.target.value }))}
                    placeholder="Qué evidencia demostrará que la acción sirvió"
                    className="rounded-none text-[13px]"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="ac-inicio">Inicio</Label>
                    <Input
                      id="ac-inicio"
                      type="date"
                      value={accion.fecha_inicio}
                      onChange={(e) => setAccion((a) => ({ ...a, fecha_inicio: e.target.value }))}
                      className="cifra h-10 rounded-none text-[13px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ac-fin">Fin</Label>
                    <Input
                      id="ac-fin"
                      type="date"
                      value={accion.fecha_fin}
                      onChange={(e) => setAccion((a) => ({ ...a, fecha_fin: e.target.value }))}
                      className="cifra h-10 rounded-none text-[13px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ac-monto">Inversión (MXN)</Label>
                    <Input
                      id="ac-monto"
                      inputMode="decimal"
                      value={accion.monto_inversion}
                      onChange={(e) =>
                        setAccion((a) => ({ ...a, monto_inversion: e.target.value }))
                      }
                      className="cifra h-10 rounded-none text-[13px]"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  disabled={guardarAccion.isPending}
                  onClick={() => guardarAccion.mutate()}
                  className="h-10 rounded-none"
                >
                  Registrar acción
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </section>

      {/* Seguimiento */}
      <section className="space-y-3 border border-border bg-card p-4">
        <Titulo nota="Cada sesión con el líder deja acuerdos por escrito. Sin acuerdos, la conversación no existió.">
          Seguimiento
        </Titulo>
        {(data?.sesiones ?? []).length === 0 ? (
          <p className="border border-dashed border-border p-4 text-center text-[13px] text-cota">
            Sin sesiones registradas.
          </p>
        ) : (
          <ol className="space-y-2">
            {(data?.sesiones ?? []).map((s) => (
              <li key={s.id} className="border-l-2 border-plomada bg-background px-3 py-2">
                <p className="cifra text-[11px] uppercase tracking-wide text-cota">
                  {fechaCorta(s.fecha)} · {s.tipo ?? "seguimiento"}
                </p>
                <p className="mt-1 text-[13px] text-grafito">{s.acuerdos}</p>
              </li>
            ))}
          </ol>
        )}
        {puedeEditar ? (
          <div className="grid gap-3 border-t border-border pt-3 md:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="se-fecha">Fecha</Label>
              <Input
                id="se-fecha"
                type="date"
                value={sesion.fecha}
                onChange={(e) => setSesion((s) => ({ ...s, fecha: e.target.value }))}
                className="cifra h-10 rounded-none text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="se-tipo">Tipo</Label>
              <Select
                value={sesion.tipo}
                onValueChange={(v) => setSesion((s) => ({ ...s, tipo: v }))}
              >
                <SelectTrigger id="se-tipo" className="h-10 rounded-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  {TIPOS_SESION.map((t) => (
                    <SelectItem key={t} value={t} className="rounded-none">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="se-acuerdos">Acuerdos</Label>
              <Textarea
                id="se-acuerdos"
                rows={2}
                value={sesion.acuerdos}
                onChange={(e) => setSesion((s) => ({ ...s, acuerdos: e.target.value }))}
                className="rounded-none text-[13px]"
              />
            </div>
            <Button
              disabled={agregarSesion.isPending}
              onClick={() => agregarSesion.mutate()}
              className="h-10 rounded-none text-[12px] md:col-start-4"
            >
              Registrar sesión
            </Button>
          </div>
        ) : null}
      </section>

      {/* Efectividad */}
      <section className="space-y-3 border border-border bg-card p-4">
        <Titulo nota="La agenda sirvió si el comportamiento cambió. Se confirma dos veces: quien se desarrolla y quien lo observa.">
          Medición de efectividad
        </Titulo>
        {prioridades.length === 0 ? (
          <p className="border border-dashed border-border p-4 text-center text-[13px] text-cota">
            Sin prioridades que medir.
          </p>
        ) : (
          <ul className="space-y-2">
            {prioridades.map((p) => (
              <MedicionFila
                key={p.id}
                prioridad={p}
                medicion={(data?.mediciones ?? []).find((m) => m.prioridad_id === p.id) ?? null}
                puedeEditar={puedeEditar}
                esLider={esLider || esTalento}
                onGuardar={(valores) => guardarMedicion.mutate({ prioridadId: p.id, ...valores })}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MedicionFila({
  prioridad,
  medicion,
  puedeEditar,
  esLider,
  onGuardar,
}: {
  prioridad: { id: string; descripcion: string | null };
  medicion: {
    autoevaluacion: boolean | null;
    evaluacion_jefe: boolean | null;
    comentarios: string | null;
    fecha: string | null;
  } | null;
  puedeEditar: boolean;
  esLider: boolean;
  onGuardar: (v: { autoevaluacion: boolean; evaluacionJefe: boolean; comentarios: string }) => void;
}) {
  const [auto, setAuto] = useState(medicion?.autoevaluacion === true);
  const [jefe, setJefe] = useState(medicion?.evaluacion_jefe === true);
  const [comentarios, setComentarios] = useState(medicion?.comentarios ?? "");
  const confirmada = medicion?.autoevaluacion === true && medicion?.evaluacion_jefe === true;

  return (
    <li className="border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="min-w-0 text-[13px] text-grafito">{prioridad.descripcion}</p>
        <span
          className={cn(
            "cifra border px-2 py-0.5 text-[11px] uppercase tracking-wide",
            confirmada ? "border-linea text-linea" : "border-casco text-casco",
          )}
        >
          {confirmada ? "Cambio confirmado" : "Pendiente"}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`me-auto-${prioridad.id}`}
            disabled={!puedeEditar}
            checked={auto}
            onCheckedChange={(v) => setAuto(v === true)}
          />
          <Label htmlFor={`me-auto-${prioridad.id}`} className="text-[13px] text-cota">
            El colaborador observa el cambio
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id={`me-jefe-${prioridad.id}`}
            disabled={!esLider}
            checked={jefe}
            onCheckedChange={(v) => setJefe(v === true)}
          />
          <Label htmlFor={`me-jefe-${prioridad.id}`} className="text-[13px] text-cota">
            El líder observa el cambio
          </Label>
        </div>
        {medicion?.fecha ? (
          <span className="cifra text-[11px] text-cota">
            Última medición {fechaCorta(medicion.fecha)}
          </span>
        ) : null}
      </div>
      <div className="mt-2 space-y-1.5">
        <Label htmlFor={`me-com-${prioridad.id}`}>Evidencia observada</Label>
        <Textarea
          id={`me-com-${prioridad.id}`}
          rows={2}
          disabled={!puedeEditar}
          value={comentarios}
          onChange={(e) => setComentarios(e.target.value)}
          className="rounded-none text-[13px]"
        />
      </div>
      {puedeEditar ? (
        <Button
          variant="outline"
          onClick={() => onGuardar({ autoevaluacion: auto, evaluacionJefe: jefe, comentarios })}
          className="mt-2 h-10 rounded-none text-[12px]"
        >
          Guardar medición
        </Button>
      ) : null}
    </li>
  );
}
