import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/nexus/app-shell";
import { EsqueletoAplicacion } from "@/components/nexus/esqueletos";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Si el navegador no guarda ninguna sesión, no tiene caso esperar.
    const hayTokenGuardado =
      typeof window !== "undefined" &&
      Object.keys(window.localStorage).some((k) => k.startsWith("sb-") && k.endsWith("-auth-token"));
    if (!hayTokenGuardado) throw redirect({ to: "/auth" });

    // Espera a que la sesión se hidrate desde localStorage antes de decidir el redirect.
    let sesion = (await supabase.auth.getSession()).data.session;
    for (let intento = 0; !sesion && intento < 10; intento++) {
      await new Promise((r) => setTimeout(r, 100));
      sesion = (await supabase.auth.getSession()).data.session;
    }
    if (!sesion) throw redirect({ to: "/auth" });
    return { user: sesion.user };
  },
  pendingMs: 0,
  pendingComponent: EsqueletoAplicacion,
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});