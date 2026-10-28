import {
  Banknote, BookOpen, Bus, Car, Coffee, Dumbbell, Gift, GraduationCap, HeartPulse, House, PawPrint, Plane, Smartphone, ShoppingCart, Shirt, Tag, Ticket, Utensils, Wallet, Zap,
  type LucideIcon,
} from 'lucide-react'

const ICONOS: Record<string, LucideIcon> = {
  utensils: Utensils, cart: ShoppingCart, bus: Bus, home: House, zap: Zap, heart: HeartPulse, shirt: Shirt,
  school: GraduationCap, ticket: Ticket, tag: Tag, banknote: Banknote, wallet: Wallet,
  coffee: Coffee, gift: Gift, paw: PawPrint, phone: Smartphone, gym: Dumbbell, plane: Plane, car: Car, book: BookOpen,
}

/** Nombre de cada ícono para los lectores de pantalla y el selector */
export const NOMBRE_ICONO: Record<string, string> = {
  utensils: 'Comida', cart: 'Mercado', bus: 'Bus', home: 'Casa', zap: 'Servicios', heart: 'Salud', shirt: 'Ropa', school: 'Estudio', ticket: 'Entretenimiento',
  tag: 'Etiqueta', banknote: 'Billetes', wallet: 'Billetera', coffee: 'Café', gift: 'Regalo', paw: 'Mascota', phone: 'Celular', gym: 'Deporte', plane: 'Viajes',
  car: 'Carro', book: 'Libros',
}

export function Icono({ nombre, className }: { nombre: string; className?: string }) {
  const I = ICONOS[nombre] ?? Tag
  return <I aria-hidden="true" className={className} />
}

export function IconoCategoria({ nombre }: { nombre: string }) {
  const Icono = ICONOS[nombre] ?? Tag
  return (
    <span className="cat-ico" aria-hidden="true">
      <Icono className="size-5" />
    </span>
  )
}
