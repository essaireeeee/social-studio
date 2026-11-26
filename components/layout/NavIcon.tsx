import {
  BadgeCheck,
  CalendarClock,
  CalendarDays,
  Ellipsis,
  House,
  Lightbulb,
  Megaphone,
  Settings,
  SpellCheck,
  Database,
  Dna,
  Hash,
  History,
  Library,
  Newspaper,
  Radio,
  SlidersHorizontal,
  Sparkles,
  SquarePen,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { NavIcon as NavIconName } from "@/lib/shell/navigation";

const ICONS: Record<NavIconName, LucideIcon> = {
  dashboard: House,
  calendar: CalendarClock,
  ideas: Lightbulb,
  french: SpellCheck,
  campaigns: Megaphone,
  more: Ellipsis,
  settings: Settings,
  studio: SquarePen,
  live: Radio,
  daily: Newspaper,
  library: Library,
  fighters: Users,
  events: CalendarDays,
  hashtags: Hash,
  editorial: Dna,
  history: History,
  validated: BadgeCheck,
  ai: Sparkles,
  preferences: SlidersHorizontal,
  data: Database,
  users: UserCog,
};

export function NavIcon({ name, className }: { name: NavIconName; className?: string }) {
  const Icon = ICONS[name];
  return <Icon className={className} aria-hidden="true" />;
}
