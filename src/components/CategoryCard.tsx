import React from "react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { cn } from "@/lib/utils";
import { Category } from "@/types";

interface CategoryCardProps {
  category: Category;
  isArabic: boolean;
  onClick: () => void;
  selected?: boolean;
}

// The one category card design used everywhere categories are shown
// (home page grid, search page filter grid) — keeps the app's category
// browsing visually consistent instead of each page inventing its own.
export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  isArabic,
  onClick,
  selected = false,
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center rounded-2xl bg-card p-2 transition-all hover:bg-accent card-glow",
        selected && "ring-2 ring-primary",
      )}
    >
      {category.imageUrl ? (
        <img
          src={category.imageUrl}
          alt={isArabic ? category.nameAr : category.nameEn}
          className="mb-2 h-20 w-20 rounded-lg object-cover"
        />
      ) : (
        <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <CategoryIcon icon={category.icon} size={36} />
        </div>
      )}
      <span className="text-xs font-medium text-card-foreground text-center line-clamp-1">
        {isArabic ? category.nameAr : category.nameEn}
      </span>
    </button>
  );
};

export default CategoryCard;
