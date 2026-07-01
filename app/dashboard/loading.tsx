import { Header } from "@/components/dashboard/header";

export default function DashboardLoading() {
  return (
    <>
      <Header title="Media" />
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="h-4 w-64 animate-pulse bg-[#E5E4DE]" />
          <div className="h-9 w-32 animate-pulse bg-[#E5E4DE]" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse bg-[#E5E4DE]/50"
            />
          ))}
        </div>
      </div>
    </>
  );
}
