import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-12 items-center justify-center border-2 border-[#0A0A0A] bg-[#E5E4DE] text-[#5C5C5C] shadow-[4px_4px_0_0_#0A0A0A]">
        <svg
          className="size-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m6 4.125 2.25 2.25m0 0 2.25 2.25M12 11.625l2.25-2.25M12 11.625l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
          />
        </svg>
      </div>
      <div>
        <h2 className="font-heading text-base font-medium">Page not found</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been
          removed.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex items-center justify-center border-2 border-[#0A0A0A] bg-[#FFFFFF] px-4 py-2 text-sm font-medium text-[#0A0A0A] shadow-[4px_4px_0_0_#0A0A0A] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#0A0A0A]"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
