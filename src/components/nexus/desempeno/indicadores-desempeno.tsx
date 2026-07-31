import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { TarjetaIndicador } from "@/components/nexus/tarjeta-indicador";
import { EsqueletoIndicadores } from "@/components/nexus/esqueletos";
import { leerPerfil } from "@/lib/nexus/desempeno";
import {
  AVISO_AGREGADO_INSUFICIENTE,
  AVISO_CONFIDENCIAL,
  MINIMO_AGREGADO,
} from "@/lib/nexus/evaluacion";
import { fechaCorta } from "@/lib/nexus/formato";

const selectCls = "h-10 w-full border border-border bg-card px-2 text-[13px] text-grafito";

export function IndicadoresDesempeno() {
  const [area, setArea] = useState("");
  const [proyecto, setProyecto] = useState("");
  const hoy = fechaCorta(new Date());

  const { data, isLoading } = useQuery({
    queryKey: ["desempeno-indicadores"],
    retry: 3,
    queryFn: async () => {
      const [ciclos, evaluaciones, objetivos, mapeo, colaboradores, puestos, proyectos] =
        await Promise.all([
          supabase.from("ciclos_evaluacion").select("id, nombre, estatus, fecha_inicio").order("fecha_inicio"),
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
        ? (
            await supabase
              .from("evaluacion_competencias")
              .select("evaluacion_id, competencia_id, nivel_observado")
              .in("evaluacion_id", evalIds)
          ).data ?? []
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
    () => Array.from(new Set((data?.colaboradores ?? []).map((c) => c.area).filter(Boolean))) as string[],
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

    const vigente = [...data.ciclos].reverse().find((c) => c.estatus !== "cerrado") ?? null;
    const cerrado = [...data.ciclos].reverse().find((c) => c.estatus === "cerrado") ?? null;

    const evsVigente = data.evaluaciones.filter(
      (e) => e.ciclo_id === vigente?.id && e.colaborador_id && ids.has(e.colaborador_id),
    );
    const cobertura =
      evsVigente.length > 0
        ? (evsVigente.filter((e) => e.estatus === "completado").length / evsVigente.length) * 100
        : null;

    // Brecha solo con perfiles validados
    const evsCerrado = data.evaluaciones.filter(
      (e) => e.ciclo_id === cerrado?.id && e.colaborador_id && ids.has(e.colaborador_id),
    );
    const mapaEval = new Map(evsCerrado.map((e) => [e.id, e.colaborador_id]));
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

    const cicloObjetivos =
      [...data.ciclos].reverse().find((c) => data.objetivos.some((o) => o.ciclo_id === c.id)) ?? null;
    const conEsg = new Set(
      data.objetivos
        .filter((o) => o.ciclo_id === cicloObjetivos?.id && o.tipo === "esg" && o.colaborador_id)
        .map((o) => o.colaborador_id as string),
    );
    const pctEsg = (pob.filter((c) => conEsg.has(c.id)).length / pob.length) * 100;

    const cicloMapeo =
      [...data.ciclos].reverse().find((c) => data.mapeo.some((m) => m.ciclo_id === c.id)) ?? null;
    const conMapeo = new Set(
      data.mapeo.filter((m) => m.ciclo_id === cicloMapeo?.id).map((m) => m.colaborador_id as string),
    );
    const pctMapeo = (pob.filter((c) => conMapeo.has(c.id)).length / pob.length) * 100;

    return {
      insuficiente: false as const,
      n: pob.length,
      vigente,
      cerrado,
      cobertura,
      brecha,
      brechaMuestra: n,
      sinValidar,
      puestosSinValidar: puestosSinValidar.size,
      pctEsg,
      pctMapeo,
      cicloObjetivos,
      cicloMapeo,
    };
  }, [data, area, proyecto]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="filtro-area">Área</Label>
          <select id="filtro-area" className={selectCls} value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">Todas</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filtro-proyecto">Proyecto</Label>
          <select
            id="filtro-proyecto"
            className={selectCls}
            value={proyecto}
            onChange={(e) => setProyecto(e.target.value)}
          >
            <option value="">Todos</option>
            {(data?.proyectos ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
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
            fuente={`Nexus · ${calculo.vigente?.nombre ?? "sin ciclo vigente"} · ${calculo.n} personas`}
            fechaCorte={hoy}
            nota={
              calculo.cobertura === null ? (
                <p className="text-[12px] text-cota">No hay ciclo vigente con evaluaciones generadas.</p>
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
            fuente={`Nexus · ${calculo.cerrado?.nombre ?? "sin ciclo cerrado"} · ${calculo.brechaMuestra} respuestas`}
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
            fuente={`Nexus · ${calculo.cicloObjetivos?.nombre ?? "sin objetivos"} · ${calculo.n} personas`}
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
            fuente={`Nexus · ${calculo.cicloMapeo?.nombre ?? "sin mapeo"} · ${calculo.n} personas`}
            fechaCorte={hoy}
          />
        </div>
      )}
    </section>
  );
}