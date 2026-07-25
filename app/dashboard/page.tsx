import { getUserMedia, verifySession } from "@/lib/dal";
import DashboardContent from "@/components/dashboard/dashboard-content";

export default async function DashboardPage() {
  const media = await getUserMedia();
  const { email, user } = await verifySession();
  const userName = user.user_metadata?.full_name as string | undefined;

  return (
    <>
      <DashboardContent
        initialItems={media}
        userId={user.id}
        userEmail={email}
        userName={userName}
      />
    </>
  );
}
