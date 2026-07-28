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

export const MODULOS: Modulo[] = [
  { nombre: "Tablero", ruta: "/tablero", icono: LayoutDashboard, movil: true },
  { nombre: "Atracción", ruta: "/atraccion", icono: UserSearch },
  { nombre: "Colaboradores", ruta: "/colaboradores", icono: Users, movil: true },
  { nombre: "Desempeño", ruta: "/desempeno", icono: Target },
  { nombre: "Desarrollo", ruta: "/desarrollo", icono: GraduationCap },
  { nombre: "Tiempo", ruta: "/tiempo", icono: CalendarClock, movil: true },
  { nombre: "Bienestar", ruta: "/bienestar", icono: HeartPulse, movil: true },
  { nombre: "Comunicación", ruta: "/comunicacion", icono: Megaphone },
  { nombre: "Seguridad e Higiene", ruta: "/seguridad", icono: HardHat },
  { nombre: "Analítica", ruta: "/analitica", icono: BarChart3, movil: true },
  { nombre: "Configuración", ruta: "/configuracion", icono: Settings },
];