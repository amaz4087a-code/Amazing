import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user;
  const role = (user as any)?.role as string | undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">系统设置</h1>
        <p className="text-muted-foreground">管理个人和系统配置</p>
      </div>

      <SettingsForm
        user={{
          name: user.name ?? null,
          email: user.email!,
          role: role ?? "STUDENT",
        }}
      />
    </div>
  );
}
