import {
  Trophy,
  PawPrint,
  HandHeart,
  Leaf,
  Building2,
  Lightbulb,
  Globe,
  Star,
  Palette,
} from "lucide-react";
import type { ComponentType } from "react";

interface IconProps {
  className?: string;
  size?: number;
}

export const CATEGORY_LUCIDE: Record<string, ComponentType<IconProps>> = {
  SPORT: Trophy,
  ZIVALI: PawPrint,
  SKUPNOST: HandHeart,
  NARAVA: Leaf,
  INFRASTRUKTURA: Building2,
  PODJETNISTVO: Lightbulb,
  SLOVENIJA_V_SVETU: Globe,
  JUNAKI: Star,
  KULTURA: Palette,
};

export function CategoryIcon({
  category,
  className = "w-4 h-4",
  size,
}: {
  category: string;
  className?: string;
  size?: number;
}) {
  const Icon = CATEGORY_LUCIDE[category];
  if (!Icon) return <span className={className}>•</span>;
  return <Icon className={className} size={size} />;
}
