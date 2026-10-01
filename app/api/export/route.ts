import { defaultSurvey } from "@/lib/data/defaultSurvey";
import { getAllSubmissions, StoredSessionRecord } from "@/lib/storage/db";

function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) {
    return "";
  }
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "cleaned";

  const submissions: StoredSessionRecord[] = await getAllSubmissions();

  if (type === "raw") {
    const headers = [
      "sessionId",
      "respondentEmail",
      "deviceType",
      "viewport",
      "presentationArm",
      "itemId",
      "prompt",
      "answerValue",
      "firstInputLatencyMs",
      "activeDwellTimeMs",
      "scrollReversals",
      "focusOutCount",
      "focusOutDurationMs",
      "answerRevisions",
      "qualityFlags",
      "sessionQualityScore",
      "completedAt",
    ];

    const rows: string[] = [headers.join(",")];

    submissions.forEach((sub) => {
      const email = sub.respondentEmail || "anonymous";
      const dev = sub.deviceContext?.deviceType || "desktop";
      const vp = sub.deviceContext?.viewport ? `${sub.deviceContext.viewport.width}x${sub.deviceContext.viewport.height}` : "";
      const arm = sub.deviceContext?.presentationArm || "single_card";
      const score = sub.qualityResult?.score ?? 100;
      const completedAt = sub.timestamps?.completedAt || sub.createdAt || "";

      defaultSurvey.items.forEach((item) => {
        const log = sub.telemetryLogs?.[item.id];
        const rawAns = sub.answers?.[item.id] ?? "";
        const flags = log?.qualityFlags ? log.qualityFlags.join(";") : "";

        const row = [
          escapeCsvCell(sub.sessionId),
          escapeCsvCell(email),
          escapeCsvCell(dev),
          escapeCsvCell(vp),
          escapeCsvCell(arm),
          escapeCsvCell(item.id),
          escapeCsvCell(item.prompt),
          escapeCsvCell(rawAns),
          escapeCsvCell(log?.firstInputLatencyMs ?? ""),
          escapeCsvCell(log?.activeDwellTimeMs ?? 0),
          escapeCsvCell(log?.scrollReversalsYFlips ?? 0),
          escapeCsvCell(log?.focusOutCount ?? 0),
          escapeCsvCell(log?.focusOutDurationMs ?? 0),
          escapeCsvCell(log?.answerRevisions ?? 0),
          escapeCsvCell(flags),
          escapeCsvCell(score),
          escapeCsvCell(completedAt),
        ];

        rows.push(row.join(","));
      });
    });

    const csvContent = rows.join("\r\n");
    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="master_raw_paradata.csv"',
      },
    });
  }

  // Otherwise: type === "cleaned" (SPSS/R master dataset)
  const itemHeaders = defaultSurvey.items.map((item) => item.id);
  const headers = [
    "session_id",
    "respondent_email",
    "device_type",
    "viewport",
    "presentation_arm",
    ...itemHeaders,
    "quality_score",
    "is_quarantined",
    "completed_at",
  ];

  const rows: string[] = [headers.join(",")];

  submissions.forEach((sub) => {
    const email = sub.respondentEmail || "anonymous";
    const dev = sub.deviceContext?.deviceType || "desktop";
    const vp = sub.deviceContext?.viewport ? `${sub.deviceContext.viewport.width}x${sub.deviceContext.viewport.height}` : "";
    const arm = sub.deviceContext?.presentationArm || "single_card";
    const score = sub.qualityResult?.score ?? 100;
    const isQuarantined = score < 60 ? "true" : "false";
    const completedAt = sub.timestamps?.completedAt || sub.createdAt || "";

    const rowValues: (string | number)[] = [
      escapeCsvCell(sub.sessionId),
      escapeCsvCell(email),
      escapeCsvCell(dev),
      escapeCsvCell(vp),
      escapeCsvCell(arm),
    ];

    defaultSurvey.items.forEach((item) => {
      const ans = sub.answers?.[item.id];
      if (item.type === "likert") {
        if (typeof ans === "number") {
          rowValues.push(ans);
        } else if (typeof ans === "string" && ans.trim()) {
          const matchingOpt = item.options?.find(
            (o) => o.label.toLowerCase() === ans.trim().toLowerCase()
          );
          rowValues.push(matchingOpt ? matchingOpt.id : escapeCsvCell(ans));
        } else {
          rowValues.push("");
        }
      } else {
        rowValues.push(escapeCsvCell(ans ?? ""));
      }
    });

    rowValues.push(score);
    rowValues.push(isQuarantined);
    rowValues.push(escapeCsvCell(completedAt));

    rows.push(rowValues.join(","));
  });

  const csvContent = rows.join("\r\n");
  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="master_cleaned_dataset.csv"',
    },
  });
}
