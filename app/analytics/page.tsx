import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/session";
import { getAnalytics } from "@/lib/repository";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";

export default async function AnalyticsPage() {
  const userId = await requireUserId();
  if (!userId) redirect("/login");

  const data = await getAnalytics(userId);
  return <AnalyticsDashboard data={data} />;
}
