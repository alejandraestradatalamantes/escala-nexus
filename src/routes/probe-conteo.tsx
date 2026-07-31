import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TarjetaIndicador } from "@/components/nexus/tarjeta-indicador";

function Probe() {
  const [v, setV] = useState<number | undefined>(undefined);
  useEffect(() => {
    const t = setTimeout(() => setV(35), 300);
    return () => clearTimeout(t);
  }, []);
  if (v === undefined) return <p>cargando</p>;
  return (
    <TarjetaIndicador
      titulo="Prueba"
      formula="f"
      fuente="s"
      fechaCorte="hoy"
      valor={v}
      meta={80}
      unidad="personas"
      decimales={0}
    />
  );
}

export const Route = createFileRoute("/probe-conteo")({ component: Probe });
