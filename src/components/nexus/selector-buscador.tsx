import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface OpcionSelector {
  valor: string;
  etiqueta: string;
  detalle?: string;
}

interface Props {
  opciones: OpcionSelector[];
  valor: string;
  onCambio: (valor: string) => void;
  placeholder?: string;
  ariaLabel: string;
  buscarPlaceholder?: string;
  vacio?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/**
 * Selector con buscador para listas largas (Área, Proyecto, Ciclo, Puesto, Colaborador).
 * Esquinas rectas, alto 40px y borde `border-border`, igual que el resto del sistema.
 */
export function SelectorBuscador({
  opciones,
  valor,
  onCambio,
  placeholder = "Selecciona",
  ariaLabel,
  buscarPlaceholder = "Buscar…",
  vacio = "Sin coincidencias",
  disabled,
  className,
  id,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const elegida = opciones.find((o) => o.valor === valor);

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={abierto}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-between rounded-none border-border bg-card px-2 text-[13px] font-normal text-grafito",
            className,
          )}
        >
          <span className="min-w-0 truncate">{elegida?.etiqueta ?? placeholder}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-cota" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(20rem,90vw)] rounded-none p-0">
        <Command className="rounded-none">
          <CommandInput placeholder={buscarPlaceholder} className="h-10 text-[13px]" />
          <CommandList>
            <CommandEmpty className="px-3 py-4 text-[13px] text-cota">{vacio}</CommandEmpty>
            <CommandGroup>
              {opciones.map((o) => (
                <CommandItem
                  key={o.valor || "__vacio__"}
                  value={`${o.etiqueta} ${o.detalle ?? ""}`}
                  onSelect={() => {
                    onCambio(o.valor);
                    setAbierto(false);
                  }}
                  className="min-h-11 rounded-none text-[13px]"
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", o.valor === valor ? "opacity-100" : "opacity-0")}
                    aria-hidden
                  />
                  <span className="min-w-0 truncate">{o.etiqueta}</span>
                  {o.detalle ? (
                    <span className="cifra ml-auto shrink-0 pl-2 text-[11px] text-cota">
                      {o.detalle}
                    </span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}