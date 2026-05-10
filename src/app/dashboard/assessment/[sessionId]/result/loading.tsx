import { Skeleton } from "@/components/ui/skeleton";

export default function ResultLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-40 rounded-lg" />
      <div className="grid gap-6 lg:grid-cols-5">
        <Skeleton className="col-span-2 h-80 rounded-lg" />
        <Skeleton className="col-span-3 h-80 rounded-lg" />
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}
