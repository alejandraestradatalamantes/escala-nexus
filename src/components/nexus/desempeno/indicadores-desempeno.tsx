import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TarjetaIndicador } from "@/components/nexus/tarjeta-indicador";
import { EsqueletoIndicadores } from "@/components/nexus/esqueletos";
import { leerPerfil } from "@/lib/nexus/desempeno";
import {
  AVISO_AGREGADO_INSUFICIENTE,
  AVISO_CONFIDENCIAL,
  MINIMO_AGREGADO,
} from "@/lib/nexus/evaluacion";
import { fechaCorta } from "@/lib/nexus/formato";

const selectCls = "h-10 w-56 rounded-none";
const TODAS = "__todas__";

export function IndicadoresDesempeno({ cicloId }: { cicloId: string }) {
  const [area, setArea] = useState("");
  const [proyecto, setProyecto] = useState("");
  const hoy = fechaCorta(new Date());

  const { data, isLoading } = useQuery({
    queryKey: ["desempeno-indicadores"],
    retry: 3,
    queryFn: async () => {
      const [ciclos, evaluaciones, objetivos, mapeo, colaboradores, puestos, proyectos] =
        await Promise.all([
          supabase
            .from("ciclos_evaluacion")
            .select("id, nombre, estatus, fecha_inicio")
            .order("fecha_inicio"),
          supabase.from("evaluaciones").select("id, ciclo_id, colaborador_id, estatus"),
          supabase.from("objetivos").select("colaborador_id, ciclo_id, tipo"),
          supabase.from("mapeo_talento").select("colaborador_id, ciclo_id"),
          supabase
            .from("colaboradores")
            .select("id, nombre, area, proyecto_actual_id, puesto_id, estatus")
            .order("nombre"),
          supabase.from("puestos").select("id, perfil_competencias"),
          supabase.from("proyectos").select("id, nombre").order("nombre"),
        ]);
      const evalIds = (evaluaciones.data ?? []).map((e) => e.id);
      const respuestas = evalIds.length
        ? ((
            await supabase
              .from("evaluacion_competencias")
              .select("evaluacion_id, competencia_id, nivel_observado")
              .in("evaluacion_id", evalIds)
          ).data ?? [])
        : [];
      return {
        ciclos: ciclos.data ?? [],
        evaluaciones: evaluaciones.data ?? [],
        objetivos: objetivos.data ?? [],
        mapeo: mapeo.data ?? [],
        colaboradores: colaboradores.data ?? [],
        puestos: puestos.data ?? [],
        proyectos: proyectos.data ?? [],
        respuestas,
      };
    },
  });

  const areas = useMemo(
    () =>
      Array.from(
        new Set((data?.colaboradores ?? []).map((c) => c.area).filter(Boolean)),
      ) as string[],
    [data?.colaboradores],
  );

  const calculo = useMemo(() => {
    if (!data) return null;
    const pob = data.colaboradores.filter(
      (c) =>
        c.estatus === "activo" &&
        (area === "" || c.area === area) &&
        (proyecto === "" || c.proyecto_actual_id === proyecto),
    );
    const ids = new Set(pob.map((c) => c.id));
    if (pob.length < MINIMO_AGREGADO) return { insuficiente: true as const, n: pob.length };

    // Todo se lee contra el ciclo seleccionado en el módulo; nunca se cruzan ciclos.
    const ciclo = data.ciclos.find((c) => c.id === cicloId) ?? null;

    const evsCiclo = data.evaluaciones.filter(
      (e) => e.ciclo_id === ciclo?.id && e.colaborador_id && ids.has(e.colaborador_id),
    );
    const cobertura =
      evsCiclo.length > 0
        ? (evsCiclo.filter((e) => e.estatus === "completado").length / evsCiclo.length) * 100
        : null;

    // Brecha solo con perfiles validados
    const mapaEval = new Map(evsCiclo.map((e) => [e.id, e.colaborador_id]));
    let suma = 0;
    let n = 0;
    let sinValidar = 0;
    const puestosSinValidar = new Set<string>();
    for (const r of data.respuestas) {
      const colabId = mapaEval.get(r.evaluacion_id);
      if (!colabId || typeof r.nivel_observado !== "number" || !r.competencia_id) continue;
      const colab = data.colaboradores.find((c) => c.id === colabId);
      const puesto = data.puestos.find((p) => p.id === colab?.puesto_id);
      if (!puesto) continue;
      const perfil = leerPerfil(puesto.perfil_competencias);
      if (!perfil.validado) {
        sinValidar += 1;
        puestosSinValidar.add(puesto.id);
        continue;
      }
      const meta = perfil.niveles[r.competencia_id];
      if (typeof meta !== "number") continue;
      suma += r.nivel_observado - meta;
      n += 1;
    }
    const brecha = n > 0 ? suma / n : null;

    const conEsg = new Set(
      data.objetivos
        .filter((o) => o.ciclo_id === ciclo?.id && o.tipo === "esg" && o.colaborador_id)
        .map((o) => o.colaborador_id as string),
    );
    const pctEsg = (pob.filter((c) => conEsg.has(c.id)).length / pob.length) * 100;

    const conMapeo = new Set(
      data.mapeo.filter((m) => m.ciclo_id === ciclo?.id).map((m) => m.colaborador_id as string),
    );
    const pctMapeo = (pob.filter((c) => conMapeo.has(c.id)).length / pob.length) * 100;

    return {
      insuficiente: false as const,
      n: pob.length,
      ciclo,
      cobertura,
      brecha,
      brechaMuestra: n,
      sinValidar,
      puestosSinValidar: puestosSinValidar.size,
      pctEsg,
      pctMapeo,
    };
  }, [data, area, proyecto, cicloId]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="filtro-area">Área</Label>
          <Select
            value={area || TODAS}
            onValueChange={(v) => setArea(v === TODAS ? "" : v)}
          >
            <SelectTrigger id="filtro-area" className={selectCls}>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value={TODAS} className="rounded-none">
                Todas
              </SelectItem>
              {areas.map((a) => (
                <SelectItem key={a} value={a} className="rounded-none">
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filtro-proyecto">Proyecto</Label>
          <Select
            value={proyecto || TODAS}
            onValueChange={(v) => setProyecto(v === TODAS ? "" : v)}
          >
            <SelectTrigger id="filtro-proyecto" className={selectCls}>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value={TODAS} className="rounded-none">
                Todos
              </SelectItem>
              {(data?.proyectos ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id} className="rounded-none">
                  {p.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="border-l-2 border-casco bg-casco/10 px-3 py-2 text-[12px] text-grafito">
        {AVISO_CONFIDENCIAL} Toda vista agregada requiere un mínimo de {MINIMO_AGREGADO} personas.
      </p>

      {isLoading || !calculo ? (
        <EsqueletoIndicadores cantidad={4} />
      ) : calculo.insuficiente ? (
        <p className="border border-dashed border-border p-6 text-center text-[13px] text-cota">
          {AVISO_AGREGADO_INSUFICIENTE}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TarjetaIndicador
            titulo="Cobertura del ciclo vigente"
            valor={calculo.cobertura ?? 0}
            meta={100}
            min={0}
            max={100}
            unidad="%"
            decimales={0}
            etiquetaMeta="Meta"
            formula="Evaluaciones respondidas ÷ evaluaciones esperadas × 100"
            fuente={`Nexus · ${calculo.ciclo?.nombre ?? "sin ciclo seleccionado"} · ${calculo.n} personas`}
            fechaCorte={hoy}
            nota={
              calculo.cobertura === null ? (
                <p className="text-[12px] text-cota">
                  Este ciclo todavía no tiene evaluaciones generadas.
                </p>
              ) : undefined
            }
          />
          <TarjetaIndicador
            titulo="Brecha contra el perfil del puesto"
            valor={calculo.brecha ?? 0}
            meta={0}
            min={-2}
            max={2}
            decimales={2}
            etiquetaMeta="Meta"
            formula="Promedio de (nivel observado − nivel meta) en puestos con perfil validado"
            fuente={`Nexus · ${calculo.ciclo?.nombre ?? "sin ciclo seleccionado"} · ${calculo.brechaMuestra} respuestas`}
            fechaCorte={hoy}
            nota={
              calculo.brecha === null || calculo.sinValidar > 0 ? (
                <p className="border-l-2 border-casco bg-casco/10 px-2 py-1 text-[12px] text-grafito">
                  {calculo.brecha === null
                    ? "No calculable: ningún puesto de esta población tiene perfil validado."
                    : `${calculo.puestosSinValidar} puestos con perfil propuesto quedaron fuera del promedio.`}{" "}
                  <Link to="/desempeno" className="underline">
                    Validar perfiles
                  </Link>
                </p>
              ) : undefined
            }
          />
          <TarjetaIndicador
            titulo="Población con objetivo ESG ligado"
            valor={calculo.pctEsg}
            meta={100}
            min={0}
            max={100}
            unidad="%"
            decimales={0}
            etiquetaMeta="Meta"
            formula="Personas con al menos un objetivo tipo ESG ÷ población × 100"
            fuente={`Nexus · ${calculo.ciclo?.nombre ?? "sin ciclo seleccionado"} · ${calculo.n} personas`}
            fechaCorte={hoy}
          />
          <TarjetaIndicador
            titulo="Población con mapeo de talento"
            valor={calculo.pctMapeo}
            meta={100}
            min={0}
            max={100}
            unidad="%"
            decimales={0}
            etiquetaMeta="Meta"
            formula="Personas con calibración registrada ÷ población × 100"
            fuente={`Nexus · ${calculo.ciclo?.nombre ?? "sin ciclo seleccionado"} · ${calculo.n} personas`}
            fechaCorte={hoy}
          />
        </div>
      )}
    </section>
  );
}
