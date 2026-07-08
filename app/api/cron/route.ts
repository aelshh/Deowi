import { processNextJob } from "@/lib/queue/worker";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";

  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      { status: 401 },
    );
  }

  const results = [];
  for (let i = 0; i < 5; i++) {
    const result = await processNextJob();
    results.push(result);
    if (!result.processed) {
      break;
    }
  }

  return NextResponse.json({
    count: results.length,
  });
}
