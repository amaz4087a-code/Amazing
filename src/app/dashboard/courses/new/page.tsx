import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NewCourseForm } from "./form";

export default async function NewCoursePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as string;
  if (role === "STUDENT") redirect("/dashboard/courses");

  return <NewCourseForm />;
}
