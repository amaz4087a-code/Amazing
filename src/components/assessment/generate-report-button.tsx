"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { FileText, FileSpreadsheet, Loader2, ChevronDown } from "lucide-react";

interface GenerateReportButtonProps {
  assessmentId: string;
}

export function GenerateReportButton({
  assessmentId,
}: GenerateReportButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const generate = async (format: "pdf" | "xlsx") => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, format }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "生成报告失败");
        return;
      }

      toast.success("报告生成成功");
      router.push(`/dashboard/reports/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "生成报告失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block">
      {loading ? (
        <Button disabled>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          生成中...
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger className="group inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            生成报告
            <ChevronDown className="ml-2 h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => generate("pdf")}>
              <FileText className="mr-2 h-4 w-4" />
              PDF 格式
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => generate("xlsx")}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel 格式
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
