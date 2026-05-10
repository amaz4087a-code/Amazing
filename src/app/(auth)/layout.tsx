import { Activity } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden flex-col justify-center bg-background p-12 lg:flex">
        <div className="mx-auto max-w-md">
          {/* Logo */}
          <div className="mb-8 flex items-center gap-1.5">
            <span className="text-3xl font-extrabold tracking-tight text-primary">
              LZ
            </span>
            <span className="text-2xl font-bold tracking-wide text-foreground">
              SPORTZ
            </span>
          </div>

          {/* Hero text */}
          <h1 className="mb-4 text-5xl font-extrabold leading-tight tracking-tight text-foreground">
            AI 运动
            <br />
            <span className="text-primary">测评系统</span>
          </h1>

          <p className="mb-6 text-lg font-medium text-primary">
            精准分析 · 科学训练
          </p>

          <p className="max-w-sm text-base leading-relaxed text-muted-foreground">
            基于 AI 姿态估计算法，实时对比标准动作与用户动作，
            提供多维度评分与训练建议，助力舞蹈训练、体育运动、康复训练。
          </p>

          {/* Feature indicators */}
          <div className="mt-10 space-y-4">
            {[
              { icon: Activity, text: "实时 3D 骨骼对比追踪" },
              { icon: Activity, text: "11 项 AI 多维度评分" },
              { icon: Activity, text: "个性化训练建议与报告导出" },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm text-foreground/80">
                    {item.text}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <p className="mt-16 text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} LZ SPORTZ. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center bg-white px-6 py-12">
        {children}
      </div>
    </div>
  );
}
