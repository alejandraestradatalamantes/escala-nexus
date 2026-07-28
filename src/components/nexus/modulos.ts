import {
  LayoutDashboard,
  UserSearch,
  Users,
  Target,
  GraduationCap,
  CalendarClock,
  HeartPulse,
  Megaphone,
  HardHat,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface Modulo {
  nombre: string;
  ruta: string;
  icono: LucideIcon;
  movil?: boolean;
}

export const MODULOS = [
  { nombre: "Tablero", ruta: "/tablero", icono: LayoutDashboard, movil: true },
  { nombre: "Atracción", ruta: "/atraccion", icono: UserSearch, movil: false },
  { nombre: "Colaboradores", ruta: "/colaboradores", icono: Users, movil: true },
  { nombre: "Desempeño", ruta: "/desempeno", icono: Target, movil: false },
  { nombre: "Desarrollo", ruta: "/desarrollo", icono: GraduationCap, movil: false },
  { nombre: "Tiempo", ruta: "/tiempo", icono: CalendarClock, movil: true },
  { nombre: "Bienestar", ruta: "/bienestar", icono: HeartPulse, movil: true },
  { nombre: "Comunicación", ruta: "/comunicacion", icono: Megaphone, movil: false },
  { nombre: "Seguridad e Higiene", ruta: "/seguridad", icono: HardHat, movil: false },
  { nombre: "Analítica", ruta: "/analitica", icono: BarChart3, movil: true },
  { nombre: "Configuración", ruta: "/configuracion", icono: Settings, movil: false },
] as const satisfies readonly Modulo[];