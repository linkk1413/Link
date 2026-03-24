import {
  Palette,
  Scissors,
  Sparkles,
  Droplets,
  Flower2,
  Hand,
  Leaf,
  Star,
  Eye,
  Syringe,
  Crown,
  Heart,
  Dumbbell,
  Apple,
  Camera,
  Shirt,
  ShoppingBag,
  PartyPopper,
  ChefHat,
  Baby,
  BookOpen,
  Home,
  FolderOpen,
  HelpCircle,
  LucideIcon,
} from "lucide-react";

// Map icon names to Lucide components (lowercase keys for case-insensitive lookup)
const iconMap: Record<string, LucideIcon> = {
  palette: Palette,
  scissors: Scissors,
  sparkles: Sparkles,
  droplets: Droplets,
  flower2: Flower2,
  hand: Hand,
  leaf: Leaf,
  star: Star,
  eye: Eye,
  syringe: Syringe,
  crown: Crown,
  heart: Heart,
  dumbbell: Dumbbell,
  apple: Apple,
  camera: Camera,
  shirt: Shirt,
  shoppingbag: ShoppingBag,
  partypopper: PartyPopper,
  chefhat: ChefHat,
  baby: Baby,
  bookopen: BookOpen,
  home: Home,
  folderopen: FolderOpen,
};

interface CategoryIconProps {
  icon?: string;
  className?: string;
  size?: number;
}

export const CategoryIcon = ({
  icon,
  className = "",
  size = 24,
}: CategoryIconProps) => {
  // Handle null, undefined, or empty icon
  if (!icon || icon.trim() === "") {
    return <HelpCircle className={className} size={size} />;
  }

  // Normalize icon name to lowercase for lookup
  const normalizedIcon = icon.toLowerCase().replace(/\s+/g, "");

  // Get the Lucide icon component (case-insensitive)
  const IconComponent = iconMap[normalizedIcon];

  if (IconComponent) {
    return <IconComponent className={className} size={size} />;
  }

  // If not found in map, check if it's an emoji (has non-ASCII characters)
  // eslint-disable-next-line no-control-regex
  if (/[^\x00-\x7F]/.test(icon)) {
    return <span className={className}>{icon}</span>;
  }

  // Fallback to help icon
  return <HelpCircle className={className} size={size} />;
};

export default CategoryIcon;
