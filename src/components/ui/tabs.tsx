import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

interface Indicador {
  left: number;
  width: number;
}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => {
  const contenedorRef = React.useRef<HTMLDivElement | null>(null);
  const [indicador, setIndicador] = React.useState<Indicador | null>(null);
  const [listo, setListo] = React.useState(false);

  const combinarRef = React.useCallback(
    (nodo: HTMLDivElement | null) => {
      contenedorRef.current = nodo;
      if (typeof ref === "function") ref(nodo);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = nodo;
    },
    [ref],
  );

  const medir = React.useCallback(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor) return;
    const activo = contenedor.querySelector<HTMLElement>('[data-state="active"]');
    if (!activo) {
      setIndicador(null);
      return;
    }
    const rectContenedor = contenedor.getBoundingClientRect();
    const rectActivo = activo.getBoundingClientRect();
    setIndicador({
      left: rectActivo.left - rectContenedor.left,
      width: rectActivo.width,
    });
    setListo(true);
  }, []);

  React.useEffect(() => {
    medir();
    const contenedor = contenedorRef.current;
    if (!contenedor) return;

    const observador = new MutationObserver(medir);
    observador.observe(contenedor, {
      attributes: true,
      attributeFilter: ["data-state"],
      subtree: true,
      childList: true,
    });

    let resizeObservador: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      resizeObservador = new ResizeObserver(medir);
      resizeObservador.observe(contenedor);
    }

    window.addEventListener("resize", medir);

    return () => {
      observador.disconnect();
      resizeObservador?.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, [medir]);

  const reducido =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  return (
    <TabsPrimitive.List
      ref={combinarRef}
      className={cn(
        "relative inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
      {indicador && (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0 h-[2px] bg-casco"
          style={{
            left: indicador.left,
            width: indicador.width,
            transition: listo && !reducido ? "left 200ms ease, width 200ms ease" : undefined,
          }}
        />
      )}
    </TabsPrimitive.List>
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative z-10 inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
