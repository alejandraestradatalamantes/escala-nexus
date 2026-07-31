import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MODULOS } from "./modulos";
import { cn } from "@/lib/utils";

interface Props {
  pathname: string;
}

/**
 * Navegación lateral de escritorio con un indicador único (barra casco de 2px)
 * que se desliza verticalmente hacia el módulo activo.
 */
export function PaletaNavLateral({ pathname }: Props) {
  const navRef = useRef<HTMLElement>(null);
  const enlacesRef = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [indicador, setIndicador] = useState<{ top: number; alto: number } | null>(null);
  const activo = MODULOS.find((m) => pathname.startsWith(m.ruta));

  useEffect(() => {
    function medir() {
      const el = activo ? enlacesRef.current[activo.ruta] : null;
      const nav = navRef.current;
      if (!el || !nav) {
        setIndicador(null);
        return;
      }
      setIndicador({ top: el.offsetTop, alto: el.offsetHeight });
    }
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [activo, pathname]);

  const reducido =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  return (
    <nav ref={navRef} className="relative flex-1 overflow-y-auto py-2">
      {indicador && (
        <span
          aria-hidden
          className={cn("absolute left-0 w-[2px] bg-casco", !reducido && "transition-[top,height] duration-200")}
          style={{ top: indicador.top, height: indicador.alto }}
        />
      )}
      {MODULOS.map((m) => {
        const esActivo = pathname.startsWith(m.ruta);
        return (
          <Link
            key={m.ruta}
            to={m.ruta}
            ref={(el) => {
              enlacesRef.current[m.ruta] = el;
            }}
            className={cn(
              "flex min-h-11 items-center gap-3 border-l-2 border-transparent px-4 py-2.5 text-[13px] transition-colors duration-150",
              esActivo
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "hover:bg-sidebar-accent/60",
            )}
          >
            <m.icono className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{m.nombre}</span>
          </Link>
        );
      })}
    </nav>
  );
}
