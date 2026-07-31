import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SelectorBuscador } from "@/components/nexus/selector-buscador";
import { useIsMobile } from "@/hooks/use-mobile";
import { fechaCorta } from "@/lib/nexus/formato";
import { ETIQUETA_TIPO, cubre, fecha as aFecha, iso } from "@/lib/nexus/tiempo";
import { cn } from "@/lib/utils";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

interface Ausencia {
  id: string;
  colaborador_id: string;
  tipo: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  nombre: string;
  proyectoId: string | null;
}

/** Cobertura del equipo: calendario en escritorio, lista agrupada en móvil. */
export function Cobertura() {
  const esMovil = useIsMobile();
  const hoy = new Date();
  const [mes, setMes] = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1, 12));
  const [proyectoFiltro, setProyectoFiltro] = useState("todos");

  const { data, isLoading } = useQuery({
    queryKey: ["tiempo-cobertura"],
    retry: 3,
    queryFn: async () => {
      const [sols, cols, proys] = await Promise.all([
        supabase
          .from("solicitudes")
          .select("id, colaborador_id, tipo, fecha_inicio, fecha_fin")
          .eq("estatus", "aprobada"),
        supabase
          .from("colaboradores")
          .select("id, nombre, proyecto_actual_id")
          .eq("estatus", "activo"),
        supabase.from("proyectos").select("id, nombre").order("nombre"),
      ]);
      const personas = cols.data ?? [];
      const ausencias: Ausencia[] = (sols.data ?? []).flatMap((s) => {
        const p = personas.find((c) => c.id === s.colaborador_id);
        if (!p) return [];
        return [{ ...s, nombre: p.nombre, proyectoId: p.proyecto_actual_id }];
      });
      return { ausencias, proyectos: proys.data ?? [] };
    },
  });

  const dias = useMemo(() => {
    const primero = new Date(mes.getFullYear(), mes.getMonth(), 1, 12);
    const ultimo = new Date(mes.getFullYear(), mes.getMonth() + 1, 0, 12);
    const desplazamiento = (primero.getDay() + 6) % 7;
    const celdas: (string | null)[] = Array.from({ length: desplazamiento }, () => null);
    for (let d = 1; d <= ultimo.getDate(); d += 1) {
      celdas.push(iso(new Date(mes.getFullYear(), mes.getMonth(), d, 12)));
    }
    return celdas;
  }, [mes]);

  if (isLoading || !data) return <Skeleton className="h-96 w-full rounded-none" />;

  const filtradas =
    proyectoFiltro === "todos"
      ? data.ausencias
      : data.ausencias.filter((a) => a.proyectoId === proyectoFiltro);

  const deDia = (dia: string) => filtradas.filter((a) => cubre(a, dia));
  const coincidenEnProyecto = (dia: string) => {
    const conteo = new Map<string, number>();
    for (const a of deDia(dia)) {
      if (!a.proyectoId) continue;
      conteo.set(a.proyectoId, (conteo.get(a.proyectoId) ?? 0) + 1);
    }
    return [...conteo.values()].some((n) => n > 1);
  };
  const nombreProyecto = (id: string | null) =>
    data.proyectos.find((p) => p.id === id)?.nombre ?? "Sin proyecto";

  const diasConAusencia = dias.filter((d): d is string => !!d && deDia(d).length > 0);

  const cabecera = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          aria-label="Mes anterior"
          onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1, 12))}
          className="h-9 rounded-none text-[12px]"
        >
          Anterior
        </Button>
        <span className="cifra min-w-[10rem] text-center text-[13px] text-grafito">
          {MESES[mes.getMonth()]} {mes.getFullYear()}
        </span>
        <Button
          variant="outline"
          aria-label="Mes siguiente"
          onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1, 12))}
          className="h-9 rounded-none text-[12px]"
        >
          Siguiente
        </Button>
      </div>
      <div className="w-full sm:w-72">
        <SelectorBuscador
          opciones={[
            { valor: "todos", etiqueta: "Todos los proyectos" },
            ...data.proyectos.map((p) => ({ valor: p.id, etiqueta: p.nombre })),
          ]}
          valor={proyectoFiltro}
          onCambio={setProyectoFiltro}
          ariaLabel="Filtrar cobertura por proyecto"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {cabecera}

      {esMovil ? (
        <div className="space-y-2">
          {diasConAusencia.length === 0 ? (
            <p className="border border-border bg-card p-4 text-[13px] text-cota">
              Sin ausencias aprobadas este mes con el filtro actual.
            </p>
          ) : (
            diasConAusencia.map((dia) => (
              <section key={dia} className="border border-border bg-card p-3">
                <h3 className="cifra flex items-center justify-between text-[12px] uppercase tracking-wide text-cota">
                  {fechaCorta(aFecha(dia))}
                  {coincidenEnProyecto(dia) ? (
                    <span className="bg-desviacion/15 px-2 py-0.5 text-desviacion">Traslape</span>
                  ) : null}
                </h3>
                <ul className="mt-2 space-y-1">
                  {deDia(dia).map((a) => (
                    <li key={a.id} className="text-[13px] text-grafito">
                      {a.nombre}
                      <span className="block text-[11px] text-cota">
                        {ETIQUETA_TIPO[a.tipo] ?? a.tipo} · {nombreProyecto(a.proyectoId)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      ) : (
        <div className="border border-border bg-card">
          <div className="grid grid-cols-7 bg-grafito text-cal">
            {DIAS.map((d) => (
              <div key={d} className="px-2 py-1.5 text-[11px] font-semibold uppercase">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {dias.map((dia, i) => {
              if (!dia) return <div key={`v-${i}`} className="min-h-[92px] border border-border/60" />;
              const lista = deDia(dia);
              const alerta = coincidenEnProyecto(dia);
              return (
                <div
                  key={dia}
                  className={cn(
                    "min-h-[92px] border border-border/60 p-1.5",
                    dia === iso(hoy) && "bg-cal",
                    alerta && "border-l-2 border-l-desviacion",
                  )}
                >
                  <span className="cifra text-[11px] text-cota">{Number(dia.slice(8))}</span>
                  <ul className="mt-1 space-y-0.5">
                    {lista.slice(0, 3).map((a) => (
                      <li
                        key={a.id}
                        title={`${a.nombre} · ${ETIQUETA_TIPO[a.tipo] ?? a.tipo} · ${nombreProyecto(a.proyectoId)}`}
                        className={cn(
                          "truncate px-1 text-[11px]",
                          alerta ? "bg-desviacion/15 text-grafito" : "bg-cota/10 text-grafito",
                        )}
                      >
                        {a.nombre}
                      </li>
                    ))}
                    {lista.length > 3 ? (
                      <li className="cifra px-1 text-[11px] text-cota">+{lista.length - 3} más</li>
                    ) : null}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-[11px] text-cota">
        Solo se muestran ausencias aprobadas. El borde y el sombreado rojo marcan los días en que
        dos o más personas del mismo proyecto están ausentes al mismo tiempo.
      </p>
    </div>
  );
}