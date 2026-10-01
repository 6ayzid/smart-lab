import { Survey } from "@/lib/data/defaultSurvey";
import { ItemTelemetry } from "@/hooks/useTelemetry";

export interface SessionExportMetadata {
  respondentEmail: string;
  deviceType: string;
  viewport: string;
  presentationArm: string;
}

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

export function downloadCsvFile(csvContent: string, fileName: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export A: Raw Paradata (CSV)
 * Columns: sessionId, respondentEmail, deviceType, viewport, presentationArm,
 * itemId, prompt, answerValue, firstInputLatencyMs, activeDwellTimeMs,
 * scrollReversals, focusOutCount, focusOutDurationMs, answerRevisions,
 * qualityFlags, sessionQualityScore
 */
export function exportRawParadataCsv(
  sessionId: string,
  survey: Survey,
  answers: Record<string, number | string>,
  telemetryLogs: Record<string, ItemTelemetry>,
  sessionQualityScore: number,
  metadata?: SessionExportMetadata
): void {
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
  ];

  const rows: string[] = [headers.join(",")];

  const respondentEmail = metadata?.respondentEmail || "anonymous";
  const deviceType = metadata?.deviceType || "desktop";
  const viewport = metadata?.viewport || "";
  const presentationArm = metadata?.presentationArm || "single_card";

  survey.items.forEach((item) => {
    const log = telemetryLogs[item.id];
    const rawAnswer = answers[item.id] ?? "";
    const flags = log ? log.qualityFlags.join(";") : "";

    const row = [
      escapeCsvCell(sessionId),
      escapeCsvCell(respondentEmail),
      escapeCsvCell(deviceType),
      escapeCsvCell(viewport),
      escapeCsvCell(presentationArm),
      escapeCsvCell(item.id),
      escapeCsvCell(item.prompt),
      escapeCsvCell(rawAnswer),
      escapeCsvCell(log?.firstInputLatencyMs ?? ""),
      escapeCsvCell(log?.activeDwellTimeMs ?? 0),
      escapeCsvCell(log?.scrollReversalsYFlips ?? 0),
      escapeCsvCell(log?.focusOutCount ?? 0),
      escapeCsvCell(log?.focusOutDurationMs ?? 0),
      escapeCsvCell(log?.answerRevisions ?? 0),
      escapeCsvCell(flags),
      escapeCsvCell(sessionQualityScore),
    ];

    rows.push(row.join(","));
  });

  const csvContent = rows.join("\r\n");
  const fileName = `raw_paradata_${sessionId}.csv`;
  downloadCsvFile(csvContent, fileName);
}

/**
 * Export B: Cleaned Dataset (SPSS/R Ready CSV)
 * - Converts Likert text answers into standardized numeric codes (1 to 5).
 * - Includes a column "is_quarantined" (true if sessionQualityScore < 60).
 * - Formats data with one row per completed session, with items as columns.
 * - Columns include session_id, respondent_email, device_type, viewport, presentation_arm
 */
export function exportCleanedDatasetCsv(
  sessionId: string,
  survey: Survey,
  answers: Record<string, number | string>,
  sessionQualityScore: number,
  metadata?: SessionExportMetadata
): void {
  const respondentEmail = metadata?.respondentEmail || "anonymous";
  const deviceType = metadata?.deviceType || "desktop";
  const viewport = metadata?.viewport || "";
  const presentationArm = metadata?.presentationArm || "single_card";

  const itemHeaders = survey.items.map((item) => item.id);
  const headers = [
    "session_id",
    "respondent_email",
    "device_type",
    "viewport",
    "presentation_arm",
    ...itemHeaders,
    "quality_score",
    "is_quarantined",
  ];

  const rowValues: (string | number)[] = [
    sessionId,
    respondentEmail,
    deviceType,
    viewport,
    presentationArm,
  ];

  survey.items.forEach((item) => {
    const answer = answers[item.id];
    if (item.type === "likert") {
      if (typeof answer === "number") {
        rowValues.push(answer);
      } else if (typeof answer === "string" && answer.trim()) {
        const matchingOpt = item.options?.find(
          (opt) => opt.label.toLowerCase() === answer.trim().toLowerCase()
        );
        rowValues.push(matchingOpt ? matchingOpt.id : answer);
      } else {
        rowValues.push("");
      }
    } else {
      rowValues.push(answer !== undefined ? String(answer) : "");
    }
  });

  rowValues.push(sessionQualityScore);
  rowValues.push(sessionQualityScore < 60 ? "true" : "false");

  const rows = [
    headers.map(escapeCsvCell).join(","),
    rowValues.map(escapeCsvCell).join(","),
  ];

  const csvContent = rows.join("\r\n");
  const fileName = `cleaned_survey_data_${sessionId}.csv`;
  downloadCsvFile(csvContent, fileName);
}
