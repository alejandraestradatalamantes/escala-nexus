import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MODULOS } from "./modulos";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface Props {
  abierto: boolean;
  onCambiarAbierto: (abierto: boolean) => void;
}

/**
 * Paleta de comandos del header: búsqueda global (Colaboradores, Candidatos,
 * Vacantes, Proyectos) más navegación directa a cualquier módulo ("Ir a").
 * Se abre con ⌘K / Ctrl+K o al hacer clic en el disparador del header.
 */
export function PaletaBuscador({ abierto, onCambiarAbierto }: Props) {
  const navigate = useNavigate();
  const [termino, setTermino] = useState("");

  useEffect(() => {
    if (!abierto) setTermino("");
  }, [abierto]);

  const { data: resultados, isFetching: buscando } = useQuery({
    queryKey: ["busqueda-global", termino],
    enabled: termino.trim().length >= 2,
    queryFn: async () => {
      const t = `%${termino.trim()}%`;
      // Cada consulta respeta las políticas del rol activo: si no hay permiso, no regresa filas.
      const [cols, cands, vacs, proys] = await Promise.all([
        supabase.from("colaboradores").select("id, nombre").ilike("nombre", t).limit(5),
        supabase.from("candidatos").select("id, nombre, estatus, vacante_id").ilike("nombre", t).limit(5),
        supabase.from("vacantes").select("id, estatus, puesto_id, puestos(nombre)").limit(50),
        supabase.from("proyectos").select("id, nombre").ilike("nombre", t).limit(3),
      ]);
      const terminoLower = termino.trim().toLowerCase();
      return {
        colaboradores: cols.data ?? [],
        candidatos: cands.data ?? [],
        vacantes: (vacs.data ?? [])
          .filter((v) =>
            ((v as { puestos?: { nombre?: string } }).puestos?.nombre ?? "").toLowerCase().includes(terminoLower),
          )
          .slice(0, 5),
        proyectos: proys.data ?? [],
      };
    },
  });

  const totalResultados =
    (resultados?.colaboradores.length ?? 0) +
    (resultados?.candidatos.length ?? 0) +
    (resultados?.vacantes.length ?? 0) +
    (resultados?.proyectos.length ?? 0);

  const buscarActivo = termino.trim().length >= 2;

  function ir(a: () => void) {
    a();
    onCambiarAbierto(false);
    setTermino("");
  }

  return (
    <Dialog open={abierto} onOpenChange={onCambiarAbierto}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden rounded-none border-border p-0">
        <DialogTitle className="sr-only">Buscador global</DialogTitle>
        <Command className="rounded-none" shouldFilter={false}>
          <CommandInput
            value={termino}
            onValueChange={setTermino}
            placeholder="Buscar colaboradores, candidatos, vacantes, proyectos"
            className="h-11 text-[13px]"
          />
          <CommandList className="max-h-96">
            {buscarActivo && !resultados && buscando ? (
              <div className="px-3 py-4 text-[13px] text-cota">Buscando…</div>
            ) : buscarActivo && totalResultados === 0 ? (
              <CommandEmpty className="px-3 py-4 text-[13px] text-cota">
                Sin coincidencias. Ajusta el término y vuelve a buscar.
              </CommandEmpty>
            ) : null}

            {buscarActivo && resultados && resultados.colaboradores.length > 0 && (
              <CommandGroup heading="Colaboradores">
                {resultados.colaboradores.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`col-${c.id}`}
                    className="min-h-11 rounded-none text-[13px]"
                    onSelect={() =>
                      ir(() => navigate({ to: "/colaboradores/$id", params: { id: c.id } }))
                    }
                  >
                    {c.nombre}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {buscarActivo && resultados && resultados.candidatos.length > 0 && (
              <CommandGroup heading="Candidatos">
                {resultados.candidatos.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`cand-${c.id}`}
                    disabled={!c.vacante_id}
                    className="min-h-11 rounded-none text-[13px]"
                    onSelect={() =>
                      c.vacante_id &&
                      ir(() => navigate({ to: "/atraccion/$id", params: { id: c.vacante_id! } }))
                    }
                  >
                    {c.nombre} <span className="text-cota">· {c.estatus}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {buscarActivo && resultados && resultados.vacantes.length > 0 && (
              <CommandGroup heading="Vacantes">
                {resultados.vacantes.map((v) => (
                  <CommandItem
                    key={v.id}
                    value={`vac-${v.id}`}
                    className="min-h-11 rounded-none text-[13px]"
                    onSelect={() => ir(() => navigate({ to: "/atraccion/$id", params: { id: v.id } }))}
                  >
                    {(v as { puestos?: { nombre?: string } }).puestos?.nombre ?? "Vacante"}{" "}
                    <span className="text-cota">· {v.estatus}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {buscarActivo && resultados && resultados.proyectos.length > 0 && (
              <CommandGroup heading="Proyectos">
                {resultados.proyectos.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`proy-${p.id}`}
                    disabled
                    className="min-h-11 rounded-none text-[13px] text-cota"
                  >
                    {p.nombre}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandGroup heading="Ir a">
              {MODULOS.map((m) => (
                <CommandItem
                  key={m.ruta}
                  value={`modulo-${m.nombre}`}
                  className="min-h-11 rounded-none text-[13px]"
                  onSelect={() => ir(() => navigate({ to: m.ruta }))}
                >
                  <m.icono className="h-4 w-4 shrink-0" aria-hidden />
                  {m.nombre}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export function useAtajoTeclado(alternar: () => void) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        alternar();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [alternar]);
}

export function esMac() {
  if (typeof navigator === "undefined") return false;
  return /mac/i.test(navigator.platform || navigator.userAgent);
}
