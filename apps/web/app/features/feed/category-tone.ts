import type { CategoryKey } from "@aihot/contracts/taxonomy";

/** Ochre identifies energy; blue carries the other editorial sections. */
export function categoryTone(category: CategoryKey) {
  return category === "energia" ? "text-amber-ink" : "text-editorial-blue";
}
