import { Skeleton } from "@/components/ui/skeleton";

export function BoardSkeleton() {
  return (
    <div className="flex h-full w-full gap-5 overflow-x-auto p-6">
      {[1, 2, 3, 4].map((col) => (
        <div
          key={col}
          className="flex h-full w-80 shrink-0 flex-col rounded-2xl border border-border/40 bg-card/40 p-3.5 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between pb-3 border-b border-border/30">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-20 rounded-full" />
              <Skeleton className="h-5 w-6 rounded-full" />
            </div>
            <Skeleton className="h-6 w-6 rounded-md" />
          </div>

          <div className="flex flex-col gap-3 mt-3 flex-1">
            <div className="rounded-xl border border-border/40 bg-card/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-14 rounded-full" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
              <Skeleton className="h-4 w-4/5 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
              <div className="flex items-center justify-between pt-2 border-t border-border/20">
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
            </div>

            <div className="rounded-xl border border-border/40 bg-card/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-12 rounded-full" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
              <Skeleton className="h-4 w-3/4 rounded" />
              <div className="flex items-center justify-between pt-2 border-t border-border/20">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
            </div>

            <div className="rounded-xl border border-border/40 bg-card/60 p-4 space-y-3 opacity-60">
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-4 w-2/3 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
