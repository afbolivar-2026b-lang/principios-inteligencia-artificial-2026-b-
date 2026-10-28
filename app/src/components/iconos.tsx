import {
  Banknote, Bus, GraduationCap, HeartPulse, House, ShoppingCart, Shirt, Tag, Ticket, Utensils, Wallet, Zap,
  type LucideIcon,
} from 'lucide-react'

const ICONOS: Record<string, LucideIcon> = {
  utensils: Utensils, cart: ShoppingCart, bus: Bus, home: House, zap: Zap, heart: HeartPulse, shirt: Shirt,
  school: GraduationCap, ticket: Ticket, tag: Tag, banknote: Banknote, wallet: Wallet,
}

export function IconoCategoria({ nombre }: { nombre: string }) {
  const Icono = ICONOS[nombre] ?? Tag
  return (
    <span className="cat-ico" aria-hidden="true">
      <Icono className="size-5" />
    </span>
  )
}
