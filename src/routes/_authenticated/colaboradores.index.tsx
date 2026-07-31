import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fechaCorta, iniciales } from "@/lib/nexus/formato";
import { EsqueletoTabla } from "@/components/nexus/esqueletos";
import { Skeleton } from "@/components/ui/skeleton";
import { useSesion } from "@/hooks/use-sesion";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/colaboradores/")({
  head: () => ({
    meta: [
      { title: "Colaboradores — ESCALA Nexus" },
      { name: "description", content: "Directorio de colaboradores de Escala con filtros por área, ubicación y proyecto." },
      { property: "og:title", content: "Colaboradores — ESCALA Nexus" },
      { property: "og:description", content: "Directorio y expedientes del talento de Escala." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Directorio,
});

function Directorio() {
  const { tiene } = useSesion();
  const puedeEditar = tiene("direccion_talento");
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState("");
  const [area, setArea] = useState("todas");
  const [ubicacion, setUbicacion] = useState("todas");
  const [proyecto, setProyecto] = useState("todos");
  const [abierto, setAbierto] = useState(false);

  const { data: proyectos } = useQuery({
    queryKey: ["proyectos"],
    queryFn: async () => (await supabase.from("proyectos").select("id, nombre").order("nombre")).data ?? [],
  });
  const { data: puestos } = useQuery({
    queryKey: ["puestos"],
    queryFn: async () => (await supabase.from("puestos").select("id, nombre, area").order("nombre")).data ?? [],
  });
  const { data: colaboradores, isLoading } = useQuery({
    queryKey: ["colaboradores"],
    queryFn: async () =>
      (
        await supabase
          .from("colaboradores")
          .select("id, nombre, correo, area, ubicacion, estatus, fecha_ingreso, proyecto_actual_id, puesto_id")
          .order("nombre")
      ).data ?? [],
  });

  const areas = useMemo(
    () => Array.from(new Set((colaboradores ?? []).map((c) => c.area).filter(Boolean) as string[])).sort(),
    [colaboradores],
  );

  const filtrados = (colaboradores ?? []).filter(
    (c) =>
      c.nombre.toLowerCase().includes(texto.toLowerCase()) &&
      (area === "todas" || c.area === area) &&
      (ubicacion === "todas" || c.ubicacion === ubicacion) &&
      (proyecto === "todos" || c.proyecto_actual_id === proyecto),
  );

  const nombrePuesto = (id: string | null) => puestos?.find((p) => p.id === id)?.nombre ?? "—";
  const nombreProyecto = (id: string | null) => proyectos?.find((p) => p.id === id)?.nombre ?? "Corporativo";

  const alta = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase.from("colaboradores").insert({
        nombre: String(form.get("nombre")),
        correo: String(form.get("correo")) || null,
        area: String(form.get("area")) || null,
        ubicacion: String(form.get("ubicacion")) as "corporativo" | "campo",
        fecha_ingreso: String(form.get("fecha_ingreso")) || null,
        puesto_id: (form.get("puesto_id") as string) || null,
        proyecto_actual_id: (form.get("proyecto_id") as string) || null,
        tipo_contrato: String(form.get("tipo_contrato")) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Colaborador dado de alta");
      setAbierto(false);
      queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
    },
    onError: () =>
      toast.error("No se guardó el alta. Verifica el nombre y que tengas el rol de Dirección de Talento."),
  });

  const selectCls = "h-10 w-full border border-border bg-card px-2 text-[13px] text-grafito";

  return (
    <div className="space-y-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl text-grafito">Colaboradores</h1>
          {isLoading ? (
            <Skeleton className="mt-1 h-3 w-24 rounded-none" />
          ) : (
            <p className="cifra mt-1 text-[12px] text-cota">
              {filtrados.length} de {colaboradores?.length ?? 0}
            </p>
          )}
        </div>
        {puedeEditar && (
          <Dialog open={abierto} onOpenChange={setAbierto}>
            <DialogTrigger asChild>
              <Button className="h-10 shrink-0 rounded-none">
                <Plus className="mr-1 h-4 w-4" /> Dar de alta
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-none">
              <DialogHeader>
                <DialogTitle>Dar de alta colaborador</DialogTitle>
              </DialogHeader>
              <form
                id="alta"
                onSubmit={(e) => {
                  e.preventDefault();
                  alta.mutate(new FormData(e.currentTarget));
                }}
                className="grid gap-3 sm:grid-cols-2"
              >
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="nombre">Nombre completo</Label>
                  <Input id="nombre" name="nombre" required className="h-10 rounded-none" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="correo">Correo</Label>
                  <Input id="correo" name="correo" type="email" className="h-10 rounded-none" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fecha_ingreso">Fecha de ingreso</Label>
                  <Input id="fecha_ingreso" name="fecha_ingreso" type="date" className="h-10 rounded-none" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="puesto_id">Puesto</Label>
                  <select id="puesto_id" name="puesto_id" className={selectCls}>
                    <option value="">Sin asignar</option>
                    {puestos?.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="area">Área</Label>
                  <Input id="area" name="area" className="h-10 rounded-none" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ubicacion">Ubicación</Label>
                  <select id="ubicacion" name="ubicacion" className={selectCls}>
                    <option value="corporativo">Corporativo</option>
                    <option value="campo">Campo</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="proyecto_id">Proyecto</Label>
                  <select id="proyecto_id" name="proyecto_id" className={selectCls}>
                    <option value="">Sin proyecto</option>
                    {proyectos?.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="tipo_contrato">Tipo de contrato</Label>
                  <select id="tipo_contrato" name="tipo_contrato" className={selectCls}>
                    <option value="indeterminado">Indeterminado</option>
                    <option value="determinado">Determinado</option>
                    <option value="obra_determinada">Por obra determinada</option>
                  </select>
                </div>
              </form>
              <DialogFooter>
                <Button form="alta" type="submit" disabled={alta.isPending} className="h-10 rounded-none">
                  Dar de alta
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </header>

      <div className="grid gap-2 border border-border bg-card p-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar por nombre"
          aria-label="Buscar colaborador"
          className="h-10 rounded-none"
        />
        <select value={area} onChange={(e) => setArea(e.target.value)} aria-label="Filtrar por área" className={selectCls}>
          <option value="todas">Todas las áreas</option>
          {areas.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} aria-label="Filtrar por ubicación" className={selectCls}>
          <option value="todas">Corporativo y campo</option>
          <option value="corporativo">Corporativo</option>
          <option value="campo">Campo</option>
        </select>
        <select value={proyecto} onChange={(e) => setProyecto(e.target.value)} aria-label="Filtrar por proyecto" className={selectCls}>
          <option value="todos">Todos los proyectos</option>
          {proyectos?.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <EsqueletoTabla filas={8} columnas={6} />
      ) : filtrados.length === 0 ? (
        <div className="border border-dashed border-border bg-card p-8 text-center">
          <p className="text-[13px] text-cota">
            Aún no hay colaboradores con estos filtros. Ajusta la búsqueda o da de alta al primero.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border bg-card">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead className="bg-grafito text-cal">
              <tr>
                {["Colaborador", "Puesto", "Área", "Ubicación", "Proyecto", "Ingreso"].map((h) => (
                  <th key={h} className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-accent/40">
                  <td className="h-10 px-3">
                    <Link to="/colaboradores/$id" params={{ id: c.id }} className="flex items-center gap-2">
                      <span className="cifra grid h-6 w-6 shrink-0 place-items-center bg-plomada text-[10px] text-primary-foreground">
                        {iniciales(c.nombre)}
                      </span>
                      <span className="font-medium text-plomada underline-offset-4 hover:underline">{c.nombre}</span>
                    </Link>
                  </td>
                  <td className="px-3">{nombrePuesto(c.puesto_id)}</td>
                  <td className="px-3">{c.area ?? "—"}</td>
                  <td className="px-3 capitalize">{c.ubicacion}</td>
                  <td className="px-3">{nombreProyecto(c.proyecto_actual_id)}</td>
                  <td className="cifra px-3">{fechaCorta(c.fecha_ingreso)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}