"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface EnrollButtonsProps {
  courseId: string;
  isEnrolled: boolean;
}

export function EnrollButtons({ courseId, isEnrolled: initial }: EnrollButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(initial);

  const handleEnroll = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: isEnrolled ? "DELETE" : "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "操作失败");
      }
      setIsEnrolled(!isEnrolled);
      toast.success(isEnrolled ? "已取消报名" : "报名成功");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleEnroll}
      disabled={loading}
      variant={isEnrolled ? "outline" : "default"}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isEnrolled ? "取消报名" : "报名课程"}
    </Button>
  );
}
