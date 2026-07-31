import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface FilaValida {
  competencia: string;
  nivel: number;
  texto: string;
  orden: number;
  nivelCompetenciaId: string;
}
interface FilaRechazada {
  linea: number;
  contenido: string;
  motivo: string;
}

const PLANTILLA = "competencia,nivel,comportamiento,orden";

function partirCSV(linea: string): string[] {
  const campos: string[] = [];
  let actual = "";
  let comillas = false;
  for (let i = 0; i < linea.length; i++) {
    const ch = linea[i];
    if (ch === '"') {
      if (comillas && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else comillas = !comillas;
    } else if (ch === "," && !comillas) {
      campos.push(actual);
      actual = "";
    } else actual += ch;
  }
  campos.push(actual);
  return campos.map((c) => c.trim());
}

const normalizar = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

/** Importación de comportamientos observables desde CSV pegado. */
export function ImportarComportamientos() {
  const queryClient = useQueryClient();
  const [csv, setCsv] = useState("");

  const { data: catalogo } = useQuery({
    queryKey: ["catalogo-niveles-competencia"],
    queryFn: async () => {
      const [competencias, niveles] = await Promise.all([
        supabase.from("competencias").select("id, nombre").order("nombre"),
        supabase.from("niveles_competencia").select("id, competencia_id, nivel"),
      ]);
      return { competencias: competencias.data ?? [], niveles: niveles.data ?? [] };
    },
  });

  const analisis = useMemo(() => {
    const validas: FilaValida[] = [];
    const rechazadas: FilaRechazada[] = [];
    const lineas = csv.split(/\r?\n/).filter((l) => l.trim() !== "");
    lineas.forEach((linea, i) => {
      const campos = partirCSV(linea);
      if (i === 0 && normalizar(campos[0] ?? "") === "competencia") return;
      if (campos.length < 3) {
        rechazadas.push({ linea: i + 1, contenido: linea, motivo: "Faltan columnas" });
        return;
      }
      const [nombre, nivelTexto, texto, ordenTexto] = campos;
      const competencia = (catalogo?.competencias ?? []).find(
        (c) => normalizar(c.nombre) === normalizar(nombre ?? ""),
      );
      if (!competencia) {
        rechazadas.push({ linea: i + 1, contenido: linea, motivo: "Competencia inexistente" });
        return;
      }
      const nivel = Number(nivelTexto);
      const nivelFila = (catalogo?.niveles ?? []).find(
        (n) => n.competencia_id === competencia.id && n.nivel === nivel,
      );
      if (!nivelFila) {
        rechazadas.push({ linea: i + 1, contenido: linea, motivo: "Nivel inexistente (1 a 5)" });
        return;
      }
      if (!texto || texto.trim() === "") {
        rechazadas.push({ linea: i + 1, contenido: linea, motivo: "Comportamiento vacío" });
        return;
      }
      const orden = Number(ordenTexto);
      validas.push({
        competencia: competencia.nombre,
        nivel,
        texto: texto.trim(),
        orden: Number.isFinite(orden) && orden > 0 ? orden : validas.length + 1,
        nivelCompetenciaId: nivelFila.id,
      });
    });
    return { validas, rechazadas };
  }, [csv, catalogo]);

  const importar = useMutation({
    mutationFn: async (filas: FilaValida[]) => {
      const { error } = await supabase.from("comportamientos").insert(
        filas.map((f) => ({
          nivel_competencia_id: f.nivelCompetenciaId,
          texto: f.texto,
          orden: f.orden,
          es_demo: false,
        })),
      );
      if (error) throw error;
      return filas.length;
    },
    onSuccess: (n) => {
      toast.success(`Se importaron ${n} comportamientos observables`);
      setCsv("");
      queryClient.invalidateQueries({ queryKey: ["modelo-liderazgo"] });
    },
    onError: () =>
      toast.error("No se importaron los comportamientos. Requiere rol de Dirección de Talento."),
  });

  return (
    <section className="border border-border bg-card p-4">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-cota">
        Importar comportamientos observables
      </h2>
      <p className="mt-1 text-[13px] text-cota">
        Pega el CSV de la Agenda de Desarrollo con la estructura{" "}
        <span className="cifra text-grafito">{PLANTILLA}</span>. Revisa la vista previa antes de
        confirmar.
      </p>
      <Textarea
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        rows={6}
        aria-label="CSV de comportamientos observables"
        placeholder={`${PLANTILLA}\nVisión Estratégica,3,Propone iniciativas con base en tendencias del mercado,1`}
        className="cifra mt-3 rounded-none text-[12px]"
      />

      {csv.trim() === "" ? null : (
        <div className="mt-3 space-y-3">
          <p className="cifra text-[12px] text-cota">
            {analisis.validas.length} filas válidas · {analisis.rechazadas.length} rechazadas
          </p>
          {analisis.validas.length > 0 ? (
            <div className="max-h-64 overflow-auto border border-border">
              <table className="w-full min-w-[560px] text-left text-[13px]">
                <thead className="bg-grafito text-cal">
                  <tr>
                    {["Competencia", "Nivel", "Comportamiento", "Orden"].map((h) => (
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
                  {analisis.validas.map((f, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-1.5 text-grafito">{f.competencia}</td>
                      <td className="cifra px-3 py-1.5">{f.nivel}</td>
                      <td className="px-3 py-1.5 text-cota">{f.texto}</td>
                      <td className="cifra px-3 py-1.5">{f.orden}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="border border-dashed border-border p-4 text-center text-[13px] text-cota">
              Ninguna fila válida todavía. Verifica el nombre exacto de la competencia y el nivel.
            </p>
          )}

          {analisis.rechazadas.length > 0 ? (
            <ul className="space-y-1 border-l-2 border-desviacion bg-desviacion/5 px-3 py-2 text-[12px] text-cota">
              {analisis.rechazadas.map((r) => (
                <li key={r.linea}>
                  <span className="cifra">Línea {r.linea}</span> — {r.motivo}:{" "}
                  <span className="text-grafito">{r.contenido.slice(0, 80)}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex gap-2">
            <Button
              disabled={analisis.validas.length === 0 || importar.isPending}
              onClick={() => importar.mutate(analisis.validas)}
              className="h-10 rounded-none text-[12px]"
            >
              Importar {analisis.validas.length} filas
            </Button>
            <Button
              variant="outline"
              onClick={() => setCsv("")}
              className="h-10 rounded-none text-[12px]"
            >
              Limpiar
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
