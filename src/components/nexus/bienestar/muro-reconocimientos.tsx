import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SelectorBuscador } from "@/components/nexus/selector-buscador";
import { EsqueletoTabla } from "@/components/nexus/esqueletos";
import { fechaCorta, iniciales } from "@/lib/nexus/formato";
import { cn } from "@/lib/utils";

const MENSAJE_MINIMO = 20;

interface Props {
  colaboradorId: string | null;
}

export function MuroReconocimientos({ colaboradorId }: Props) {
  const qc = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const [para, setPara] = useState("");
  const [valor, setValor] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [publico, setPublico] = useState(true);
  const [filtro, setFiltro] = useState("todos");

  const { data: valores } = useQuery({
    queryKey: ["catalogo-valores"],
    queryFn: async () => {
      const { data } = await supabase
        .from("catalogo_valores")
        .select("clave, nombre, descripcion, activo")
        .eq("activo", true)
        .order("orden");
      return data ?? [];
    },
  });

  const { data: personas } = useQuery({
    queryKey: ["colaboradores-activos-min"],
    queryFn: async () => {
      const { data } = await supabase
        .from("colaboradores")
        .select("id, nombre, area")
        .eq("estatus", "activo")
        .order("nombre");
      return data ?? [];
    },
  });

  const { data: muro, isLoading } = useQuery({
    queryKey: ["muro-reconocimientos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reconocimientos")
        .select("id, de_id, para_id, valor_asociado, mensaje, fecha, publico")
        .order("fecha", { ascending: false })
        .limit(60);
      return data ?? [];
    },
  });

  const nombreDe = useMemo(() => {
    const mapa = new Map((personas ?? []).map((p) => [p.id, p.nombre]));
    return (id: string | null) => (id ? (mapa.get(id) ?? "Colaborador") : "—");
  }, [personas]);

  const etiquetaValor = useMemo(() => {
    const mapa = new Map((valores ?? []).map((v) => [v.clave, v.nombre]));
    return (clave: string | null) => (clave ? (mapa.get(clave) ?? clave) : "—");
  }, [valores]);

  const enviar = useMutation({
    mutationFn: async () => {
      if (!colaboradorId) throw new Error("Tu usuario no está vinculado a un expediente.");
      if (!para) throw new Error("Elige a quién reconoces.");
      if (para === colaboradorId) throw new Error("No puedes reconocerte a ti mismo.");
      if (!valor) throw new Error("Elige el valor que estás reconociendo.");
      if (mensaje.trim().length < MENSAJE_MINIMO)
        throw new Error(
          `Describe el hecho concreto: al menos ${MENSAJE_MINIMO} caracteres. Un reconocimiento sin hecho no reconoce nada.`,
        );
      const { error } = await supabase.from("reconocimientos").insert({
        de_id: colaboradorId,
        para_id: para,
        valor_asociado: valor,
        mensaje: mensaje.trim(),
        fecha: new Date().toISOString().slice(0, 10),
        publico,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reconocimiento enviado.");
      setAbierto(false);
      setPara("");
      setValor("");
      setMensaje("");
      setPublico(true);
      qc.invalidateQueries({ queryKey: ["muro-reconocimientos"] });
      qc.invalidateQueries({ queryKey: ["participacion-reconocimientos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lista = (muro ?? []).filter((r) => filtro === "todos" || r.valor_asociado === filtro);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-full max-w-72">
          <Label className="cifra text-[11px] uppercase tracking-wide text-cota">
            Filtrar por valor
          </Label>
          <SelectorBuscador
            className="mt-1"
            ariaLabel="Filtrar reconocimientos por valor"
            valor={filtro}
            onCambio={setFiltro}
            opciones={[
              { valor: "todos", etiqueta: "Todos los valores" },
              ...(valores ?? []).map((v) => ({ valor: v.clave, etiqueta: v.nombre })),
            ]}
          />
        </div>
        <Dialog open={abierto} onOpenChange={setAbierto}>
          <DialogTrigger asChild>
            <Button className="rounded-none" disabled={!colaboradorId}>
              Reconocer a alguien
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto rounded-none">
            <DialogHeader>
              <DialogTitle className="text-base">Reconocer a alguien</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="cifra text-[11px] uppercase tracking-wide text-cota">
                  ¿A quién?
                </Label>
                <SelectorBuscador
                  className="mt-1"
                  ariaLabel="Destinatario del reconocimiento"
                  valor={para}
                  onCambio={setPara}
                  placeholder="Elige a la persona"
                  opciones={(personas ?? [])
                    .filter((p) => p.id !== colaboradorId)
                    .map((p) => ({ valor: p.id, etiqueta: p.nombre, detalle: p.area ?? undefined }))}
                />
              </div>
              <div>
                <Label className="cifra text-[11px] uppercase tracking-wide text-cota">
                  Valor asociado
                </Label>
                <SelectorBuscador
                  className="mt-1"
                  ariaLabel="Valor asociado"
                  valor={valor}
                  onCambio={setValor}
                  placeholder="Elige el valor"
                  opciones={(valores ?? []).map((v) => ({ valor: v.clave, etiqueta: v.nombre }))}
                  vacio="No hay valores en el catálogo. Dirección de Talento los carga en Configuración."
                />
              </div>
              <div>
                <Label className="cifra text-[11px] uppercase tracking-wide text-cota">
                  ¿Qué hizo?
                </Label>
                <Textarea
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="El hecho concreto, no el adjetivo. «Detuvo la maniobra hasta que el arnés quedó bien anclado», no «es muy responsable»."
                  className="mt-1 min-h-28 rounded-none"
                />
                <p className="mt-1 text-[10px] text-cota">
                  {mensaje.trim().length} de {MENSAJE_MINIMO} caracteres mínimos.
                </p>
              </div>
              <div className="flex items-center justify-between border border-border px-3 py-2">
                <div>
                  <p className="text-[13px] text-grafito">Publicar en el muro</p>
                  <p className="text-[11px] text-cota">
                    Si lo apagas, solo lo verán la persona y tú.
                  </p>
                </div>
                <Switch checked={publico} onCheckedChange={setPublico} />
              </div>
              <Button
                className="w-full rounded-none"
                disabled={enviar.isPending}
                onClick={() => enviar.mutate()}
              >
                Enviar reconocimiento
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <EsqueletoTabla filas={5} columnas={3} />
      ) : lista.length === 0 ? (
        <p className="border border-border bg-card p-4 text-[13px] text-cota">
          Todavía no hay reconocimientos con ese filtro.
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {lista.map((r) => (
            <li key={r.id} className="flex gap-3 border border-border bg-card p-4">
              <span
                className="cifra flex h-9 w-9 shrink-0 items-center justify-center bg-grafito text-[12px] text-cal"
                aria-hidden
              >
                {iniciales(nombreDe(r.para_id))}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-grafito">
                  <span className="font-semibold">{nombreDe(r.de_id)}</span> reconoció a{" "}
                  <span className="font-semibold">{nombreDe(r.para_id)}</span>
                </p>
                <p className="mt-1 text-[13px] text-grafito">{r.mensaje}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="cifra border border-casco bg-casco/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-grafito">
                    {etiquetaValor(r.valor_asociado)}
                  </span>
                  <span className="cifra text-[11px] text-cota">{fechaCorta(r.fecha)}</span>
                  {!r.publico ? (
                    <span className={cn("cifra text-[11px] text-cota")}>Privado</span>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}