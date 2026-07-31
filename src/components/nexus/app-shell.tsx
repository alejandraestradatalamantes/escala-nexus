import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, LogOut, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MODULOS } from "./modulos";
import { FranjaDemo } from "./franja-demo";
import { useSesion } from "@/hooks/use-sesion";
import { ETIQUETA_ROL, iniciales } from "@/lib/nexus/formato";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const PERIODOS = ["2026 T3", "2026 T2", "2026 T1", "2025 Cierre"];

export function AppShell({ children }: { children: ReactNode }) {
  const { sesion, roles, cargando } = useSesion();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [busqueda, setBusqueda] = useState("");
  const [periodo, setPeriodo] = useState(PERIODOS[0]);

  const { data: hayDemo } = useQuery({
    queryKey: ["hay-demo"],
    retry: 3,
    retryDelay: (intento) => Math.min(1000 * 2 ** intento, 5000),
    queryFn: async () => {
      const { count, error } = await supabase
        .from("colaboradores")
        .select("id", { count: "exact", head: true })
        .eq("es_demo", true);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
  });

  const { data: resultados, isFetching: buscando } = useQuery({
    queryKey: ["busqueda-global", busqueda],
    enabled: busqueda.trim().length >= 2,
    queryFn: async () => {
      const t = `%${busqueda.trim()}%`;
      // Cada consulta respeta las políticas del rol activo: si no hay permiso, no regresa filas.
      const [cols, cands, vacs, proys] = await Promise.all([
        supabase.from("colaboradores").select("id, nombre").ilike("nombre", t).limit(5),
        supabase.from("candidatos").select("id, nombre, estatus, vacante_id").ilike("nombre", t).limit(5),
        supabase.from("vacantes").select("id, estatus, puesto_id, puestos(nombre)").limit(50),
        supabase.from("proyectos").select("id, nombre").ilike("nombre", t).limit(3),
      ]);
      const termino = busqueda.trim().toLowerCase();
      return {
        colaboradores: cols.data ?? [],
        candidatos: cands.data ?? [],
        vacantes: (vacs.data ?? [])
          .filter((v) =>
            ((v as { puestos?: { nombre?: string } }).puestos?.nombre ?? "").toLowerCase().includes(termino),
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

  async function cerrarSesion() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const movil = MODULOS.filter((m) => m.movil);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Navegación lateral — escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <span className="h-5 w-1 bg-casco" aria-hidden />
          <span className="titulo text-base text-white">ESCALA</span>
          <span className="cifra text-sm text-cota">Nexus</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {MODULOS.map((m) => {
            const activo = pathname.startsWith(m.ruta);
            return (
              <Link
                key={m.ruta}
                to={m.ruta}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors duration-150",
                  activo
                    ? "border-l-2 border-casco bg-sidebar-accent text-sidebar-accent-foreground"
                    : "border-l-2 border-transparent hover:bg-sidebar-accent/60",
                )}
              >
                <m.icono className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">{m.nombre}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4 text-[11px] text-cota">
          {cargando ? (
            <div className="space-y-2">
              <Skeleton className="h-3 w-28 rounded-none bg-white/10" />
              <Skeleton className="h-3 w-20 rounded-none bg-white/10" />
            </div>
          ) : (
            <>
              <p className="truncate">{sesion?.nombre}</p>
              <p className="cifra mt-1 truncate">
                {roles.map((r) => ETIQUETA_ROL[r]).join(" · ") || "Sin rol asignado"}
              </p>
            </>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <FranjaDemo activa={Boolean(hayDemo)} />
        <header className="sticky top-0 z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card px-4 py-2 sm:flex sm:justify-between">
          <div className="relative min-w-0 sm:w-96">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-cota" aria-hidden />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar colaboradores, candidatos, vacantes, proyectos"
              aria-label="Buscador global"
              className="h-10 rounded-none border-border pl-8 text-[13px]"
            />
            {busqueda.trim().length >= 2 && (
              <div className="absolute left-0 right-0 top-11 border border-border bg-popover p-2 shadow-md">
                {!resultados && buscando ? (
                  <div className="space-y-2 p-2">
                    <Skeleton className="h-3 w-40 rounded-none" />
                    <Skeleton className="h-3 w-32 rounded-none" />
                  </div>
                ) : totalResultados > 0 ? (
                  <div className="max-h-80 space-y-2 overflow-y-auto">
                    {resultados!.colaboradores.length > 0 && (
                      <section>
                        <h2 className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-cota">
                          Colaboradores
                        </h2>
                        <ul>
                          {resultados!.colaboradores.map((c) => (
                            <li key={c.id}>
                              <Link
                                to="/colaboradores/$id"
                                params={{ id: c.id }}
                                onClick={() => setBusqueda("")}
                                className="block px-2 py-1.5 text-[13px] hover:bg-accent"
                              >
                                {c.nombre}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}
                    {resultados!.candidatos.length > 0 && (
                      <section>
                        <h2 className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-cota">
                          Candidatos
                        </h2>
                        <ul>
                          {resultados!.candidatos.map((c) =>
                            c.vacante_id ? (
                              <li key={c.id}>
                                <Link
                                  to="/atraccion/$id"
                                  params={{ id: c.vacante_id }}
                                  onClick={() => setBusqueda("")}
                                  className="block px-2 py-1.5 text-[13px] hover:bg-accent"
                                >
                                  {c.nombre} <span className="text-cota">· {c.estatus}</span>
                                </Link>
                              </li>
                            ) : (
                              <li key={c.id} className="px-2 py-1.5 text-[13px] text-cota">
                                {c.nombre} · sin vacante asignada
                              </li>
                            ),
                          )}
                        </ul>
                      </section>
                    )}
                    {resultados!.vacantes.length > 0 && (
                      <section>
                        <h2 className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-cota">
                          Vacantes
                        </h2>
                        <ul>
                          {resultados!.vacantes.map((v) => (
                            <li key={v.id}>
                              <Link
                                to="/atraccion/$id"
                                params={{ id: v.id }}
                                onClick={() => setBusqueda("")}
                                className="block px-2 py-1.5 text-[13px] hover:bg-accent"
                              >
                                {(v as { puestos?: { nombre?: string } }).puestos?.nombre ?? "Vacante"}{" "}
                                <span className="text-cota">· {v.estatus}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}
                    {resultados!.proyectos.length > 0 && (
                      <section>
                        <h2 className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-cota">
                          Proyectos
                        </h2>
                        <ul>
                          {resultados!.proyectos.map((p) => (
                            <li key={p.id} className="px-2 py-1.5 text-[13px] text-cota">
                              {p.nombre}
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}
                  </div>
                ) : (
                  <p className="px-2 py-1.5 text-[13px] text-cota">
                    Sin coincidencias. Ajusta el término y vuelve a buscar.
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              aria-label="Selector de periodo"
              className="cifra h-10 border border-border bg-card px-2 text-[12px] text-grafito"
            >
              {PERIODOS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <Button variant="ghost" size="icon" aria-label="Notificaciones" className="h-10 w-10 rounded-none">
              <Bell className="h-4 w-4" />
            </Button>
            {cargando ? (
              <Skeleton className="h-10 w-10 shrink-0 rounded-none" />
            ) : (
              <span
                className="cifra grid h-10 w-10 shrink-0 place-items-center bg-plomada text-[12px] text-primary-foreground"
                title={sesion?.correo}
              >
                {iniciales(sesion?.nombre ?? "")}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Cerrar sesión"
              className="h-10 w-10 rounded-none"
              onClick={cerrarSesion}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 pb-24 lg:p-6 lg:pb-6">{children}</main>

        {/* Navegación inferior — campo / móvil */}
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card lg:hidden">
          {movil.map((m) => {
            const activo = pathname.startsWith(m.ruta);
            return (
              <Link
                key={m.ruta}
                to={m.ruta}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] transition-colors duration-150",
                  activo ? "border-t-2 border-casco text-plomada" : "border-t-2 border-transparent text-cota",
                )}
              >
                <m.icono className="h-5 w-5" aria-hidden />
                <span className="truncate px-1">{m.nombre}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}