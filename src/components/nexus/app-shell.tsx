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

const PERIODOS = ["2026 T3", "2026 T2", "2026 T1", "2025 Cierre"];

export function AppShell({ children }: { children: ReactNode }) {
  const { sesion, roles } = useSesion();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [busqueda, setBusqueda] = useState("");
  const [periodo, setPeriodo] = useState(PERIODOS[0]);

  const { data: hayDemo } = useQuery({
    queryKey: ["hay-demo"],
    queryFn: async () => {
      const { count } = await supabase
        .from("colaboradores")
        .select("id", { count: "exact", head: true })
        .eq("es_demo", true);
      return (count ?? 0) > 0;
    },
  });

  const { data: resultados } = useQuery({
    queryKey: ["busqueda-global", busqueda],
    enabled: busqueda.trim().length >= 2,
    queryFn: async () => {
      const t = `%${busqueda.trim()}%`;
      const [cols, proys] = await Promise.all([
        supabase.from("colaboradores").select("id, nombre").ilike("nombre", t).limit(5),
        supabase.from("proyectos").select("id, nombre").ilike("nombre", t).limit(3),
      ]);
      return {
        colaboradores: cols.data ?? [],
        proyectos: proys.data ?? [],
      };
    },
  });

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
          <p className="truncate">{sesion?.nombre}</p>
          <p className="cifra mt-1 truncate">
            {roles.map((r) => ETIQUETA_ROL[r]).join(" · ") || "Sin rol asignado"}
          </p>
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
                {resultados && (resultados.colaboradores.length || resultados.proyectos.length) ? (
                  <ul className="space-y-1">
                    {resultados.colaboradores.map((c) => (
                      <li key={c.id}>
                        <Link
                          to="/colaboradores/$id"
                          params={{ id: c.id }}
                          onClick={() => setBusqueda("")}
                          className="block px-2 py-1.5 text-[13px] hover:bg-accent"
                        >
                          {c.nombre} <span className="text-cota">· Colaborador</span>
                        </Link>
                      </li>
                    ))}
                    {resultados.proyectos.map((p) => (
                      <li key={p.id} className="px-2 py-1.5 text-[13px] text-cota">
                        {p.nombre} · Proyecto
                      </li>
                    ))}
                  </ul>
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
            <span
              className="cifra grid h-10 w-10 shrink-0 place-items-center bg-plomada text-[12px] text-primary-foreground"
              title={sesion?.correo}
            >
              {iniciales(sesion?.nombre ?? "N N")}
            </span>
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