import { Skeleton } from "@/components/ui/skeleton";

export default function MotionDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-96 rounded-lg" />
    </div>
  );
}
