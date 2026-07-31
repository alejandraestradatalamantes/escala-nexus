import { useCallback, useState, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, LogOut, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MODULOS } from "./modulos";
import { FranjaDemo } from "./franja-demo";
import { PaletaBuscador, esMac, useAtajoTeclado } from "./paleta-buscador";
import { PaletaNavLateral } from "./paleta-nav-lateral";
import { useSesion } from "@/hooks/use-sesion";
import { ETIQUETA_ROL, iniciales } from "@/lib/nexus/formato";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PERIODOS = ["2026 T3", "2026 T2", "2026 T1", "2025 Cierre"];

export function AppShell({ children }: { children: ReactNode }) {
  const { sesion, roles, cargando } = useSesion();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [periodo, setPeriodo] = useState(PERIODOS[0]);
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);

  const alternarBuscador = useCallback(() => setBuscadorAbierto((v) => !v), []);
  useAtajoTeclado(alternarBuscador);

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

  async function cerrarSesion() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const movil = MODULOS.filter((m) => m.movil);
  const atajo = esMac() ? "⌘K" : "Ctrl K";

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Navegación lateral — escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <span className="h-5 w-1 bg-casco" aria-hidden />
          <span className="titulo text-base text-white">ESCALA</span>
          <span className="cifra text-sm text-cota">Nexus</span>
        </div>
        <PaletaNavLateral pathname={pathname} />
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
          <button
            type="button"
            onClick={() => setBuscadorAbierto(true)}
            aria-label="Abrir buscador global"
            className="relative flex h-10 min-w-0 items-center gap-2 border border-border bg-card px-2 text-left text-[13px] text-cota sm:w-96"
          >
            <Search className="h-4 w-4 shrink-0 text-cota" aria-hidden />
            <span className="min-w-0 flex-1 truncate">
              Buscar colaboradores, candidatos, vacantes, proyectos
            </span>
            <span className="cifra hidden shrink-0 text-[11px] text-cota sm:inline">{atajo}</span>
          </button>

          <PaletaBuscador abierto={buscadorAbierto} onCambiarAbierto={setBuscadorAbierto} />

          <div className="flex items-center gap-2">
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger
                aria-label="Selector de periodo"
                className="cifra h-10 w-auto min-w-[7.5rem] rounded-none border-border bg-card px-2 text-[12px] text-grafito"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                {PERIODOS.map((p) => (
                  <SelectItem key={p} value={p} className="cifra rounded-none text-[12px]">
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" aria-label="Notificaciones" className="h-11 w-11 rounded-none">
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
              className="h-11 w-11 rounded-none"
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
