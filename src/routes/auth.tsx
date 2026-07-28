import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acceso — ESCALA Nexus" },
      { name: "description", content: "Inicia sesión en Nexus, el sistema de gestión de talento de Escala." },
      { property: "og:title", content: "Acceso — ESCALA Nexus" },
      { property: "og:description", content: "Inicia sesión en el sistema de gestión de talento de Escala." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Acceso,
});

function Acceso() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"entrar" | "registrar">("entrar");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/tablero", replace: true });
    });
  }, [navigate]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    setEnviando(true);
    if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email: correo, password: clave });
      setEnviando(false);
      if (error) {
        setError("El correo o la contraseña no coinciden. Verifica y vuelve a intentar.");
        return;
      }
      navigate({ to: "/tablero", replace: true });
    } else {
      const { error } = await supabase.auth.signUp({
        email: correo,
        password: clave,
        options: { emailRedirectTo: window.location.origin, data: { nombre } },
      });
      setEnviando(false);
      if (error) {
        setError(
          error.message.includes("already")
            ? "Ese correo ya tiene cuenta. Cambia a Entrar."
            : "No se creó la cuenta. Revisa que la contraseña tenga al menos 6 caracteres.",
        );
        return;
      }
      setAviso("Cuenta creada. Si tu correo requiere confirmación, revísalo y luego entra.");
      setModo("entrar");
    }
  }

  async function conGoogle() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError("No se completó el acceso con Google. Intenta de nuevo o usa tu correo.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/tablero", replace: true });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_480px]">
      <div className="hidden flex-col justify-between bg-grafito p-10 text-cal lg:flex">
        <div className="flex items-center gap-2">
          <span className="h-5 w-1 bg-casco" aria-hidden />
          <span className="titulo text-base">ESCALA</span>
          <span className="cifra text-sm text-cota">Nexus</span>
        </div>
        <p className="max-w-md text-2xl leading-snug">
          Hay valor ganado en la obra. Aquí lo hay en el talento.
        </p>
        <p className="cifra text-[11px] uppercase tracking-widest text-cota">
          Valle Oriente · San Pedro Garza García, N.L.
        </p>
      </div>

      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl text-grafito">
            {modo === "entrar" ? "Entrar a Nexus" : "Crear cuenta"}
          </h1>
          <p className="mt-2 text-[13px] text-cota">
            Usa tu correo de Escala. Tu rol determina lo que ves.
          </p>

          <form onSubmit={enviar} className="mt-6 space-y-4">
            {modo === "registrar" && (
              <div className="space-y-1.5">
                <Label htmlFor="nombre">Nombre completo</Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="h-12 rounded-none"
                  required
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="correo">Correo</Label>
              <Input
                id="correo"
                type="email"
                autoComplete="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className="h-12 rounded-none"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clave">Contraseña</Label>
              <Input
                id="clave"
                type="password"
                autoComplete={modo === "entrar" ? "current-password" : "new-password"}
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                className="h-12 rounded-none"
                required
              />
            </div>

            {error && (
              <p className="border-l-2 border-desviacion bg-desviacion/8 px-3 py-2 text-[13px] text-desviacion">
                {error}
              </p>
            )}
            {aviso && (
              <p className="border-l-2 border-linea bg-linea/8 px-3 py-2 text-[13px] text-linea">{aviso}</p>
            )}

            <Button type="submit" disabled={enviando} className="h-12 w-full rounded-none">
              {modo === "entrar" ? "Entrar" : "Crear cuenta"}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-widest text-cota">
            <span className="h-px flex-1 bg-border" />o<span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" onClick={conGoogle} className="h-12 w-full rounded-none">
            Continuar con Google
          </Button>

          <button
            type="button"
            onClick={() => setModo(modo === "entrar" ? "registrar" : "entrar")}
            className="mt-6 text-[13px] text-plomada underline underline-offset-4"
          >
            {modo === "entrar" ? "Crear una cuenta nueva" : "Ya tengo cuenta, entrar"}
          </button>

          <p className="mt-8 border-t border-border pt-4 text-[11px] leading-relaxed text-cota">
            Aviso de privacidad conforme a la LFPDPPP.{" "}
            <span className="cifra text-casco">[Pendiente de visto bueno de Jurídico]</span>
          </p>
        </div>
      </div>
    </div>
  );
}