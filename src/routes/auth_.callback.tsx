import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth_/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Verificando acceso — ESCALA Nexus" },
      { name: "description", content: "Verificación del acceso a Nexus." },
      { property: "og:title", content: "Verificando acceso — ESCALA Nexus" },
      { property: "og:description", content: "Verificación del acceso a Nexus." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Callback,
});

function Callback() {
  const navigate = useNavigate();
  const [mensaje, setMensaje] = useState("Verificando acceso…");

  useEffect(() => {
    let cancelado = false;

    async function completar() {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const query = new URLSearchParams(window.location.search);

      const errorProveedor = hash.get("error_description") || query.get("error_description");
      if (errorProveedor) return fallar("El proveedor rechazó el acceso. Intenta de nuevo o usa tu correo.");

      const access_token = hash.get("access_token");
      const refresh_token = hash.get("refresh_token");
      const code = query.get("code");

      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) return fallar("No se pudo guardar la sesión. Intenta entrar de nuevo.");
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) return fallar("No se completó el intercambio de credenciales. Intenta entrar de nuevo.");
      }

      // Confirma que la sesión quedó persistida antes de continuar.
      for (let intento = 0; intento < 20; intento++) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) {
          if (cancelado) return;
          window.history.replaceState(null, "", "/auth/callback");
          navigate({ to: "/tablero", replace: true });
          return;
        }
        await new Promise((r) => setTimeout(r, 150));
      }
      fallar("No encontramos una sesión activa. Vuelve a iniciar sesión.");
    }

    function fallar(texto: string) {
      if (cancelado) return;
      setMensaje(texto);
      window.setTimeout(() => {
        window.location.replace(`/auth?error=${encodeURIComponent(texto)}`);
      }, 1200);
    }

    completar();
    return () => {
      cancelado = true;
    };
  }, [navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-grafito px-6 text-cal">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2">
          <span className="h-5 w-1 bg-casco" aria-hidden />
          <span className="titulo text-base">ESCALA</span>
          <span className="cifra text-sm text-cota">Nexus</span>
        </div>
        <p className="mt-6 text-[13px] text-cota" role="status" aria-live="polite">
          {mensaje}
        </p>
        <div className="mt-4 h-1 w-full bg-white/10" aria-hidden>
          <div className="h-1 w-1/3 animate-pulse bg-casco" />
        </div>
      </div>
    </div>
  );
}
