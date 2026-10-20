import { cn } from "@/lib/utils";
import { PRESET_TAGS } from "@/lib/types";

const fallbackStyle = "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20";

export function getTagStyle(tag: string): string {
  const matched = PRESET_TAGS.find((p) => p.name.toLowerCase() === tag.toLowerCase());
  return matched ? matched.color : fallbackStyle;
}

export function TagBadge({
  tag,
  onRemove,
  className,
}: {
  tag: string;
  onRemove?: () => void;
  className?: string;
}) {
  const style = getTagStyle(tag);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium border tracking-wide",
        style,
        className
      )}
    >
      <span>{tag}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 opacity-60 hover:opacity-100"
        >
          ×
        </button>
      )}
    </span>
  );
}
