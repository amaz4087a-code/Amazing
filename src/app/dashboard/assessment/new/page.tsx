import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { AssessmentConfig } from "@/components/assessment/assessment-config";

export default async function NewAssessmentPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const motions = await prisma.standardMotion.findMany({
    select: { id: true, name: true, category: true, difficulty: true, relevantBodyParts: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/assessment">
          <Button variant="ghost" size="sm" className="mb-2 -ml-2">
            <ArrowLeft className="mr-1 h-4 w-4" />
            返回测评列表
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">新建测评</h1>
        <p className="text-muted-foreground">配置测评参数并开始 AI 评估</p>
      </div>

      <AssessmentConfig motions={motions} />
    </div>
  );
}
