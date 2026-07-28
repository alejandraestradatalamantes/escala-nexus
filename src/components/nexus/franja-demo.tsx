export function FranjaDemo({ activa }: { activa: boolean }) {
  if (!activa) return null;
  return (
    <div className="cifra border-b border-casco/40 bg-casco/12 px-4 py-1 text-center text-[11px] uppercase tracking-widest text-grafito">
      Datos de demostración
    </div>
  );
}