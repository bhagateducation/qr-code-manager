import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import Dashboard from "@/components/Dashboard";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <Dashboard />;
}
