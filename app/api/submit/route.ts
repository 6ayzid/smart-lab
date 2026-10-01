import { NextResponse } from "next/server";
import { saveSubmission, SubmissionPayload } from "@/lib/storage/db";

export async function POST(req: Request) {
  try {
    const body: SubmissionPayload = await req.json();

    if (!body || !body.sessionId) {
      return NextResponse.json(
        { error: "Invalid payload: sessionId is required" },
        { status: 400 }
      );
    }

    const result = await saveSubmission(body);
    return NextResponse.json({
      success: true,
      sessionId: result.id,
    });
  } catch (err) {
    console.error("[API /api/submit] Error saving submission:", err);
    return NextResponse.json(
      { error: "Failed to process survey submission" },
      { status: 500 }
    );
  }
}
