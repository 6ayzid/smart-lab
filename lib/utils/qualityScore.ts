import { SurveyItem } from "@/lib/data/defaultSurvey";
import { ItemTelemetry } from "@/hooks/useTelemetry";

export type QualityStatus = "high_integrity" | "marginal" | "quarantined";

export interface SessionQualityResult {
  score: number;
  status: QualityStatus;
  penaltyBreakdown: string[];
}

export function calculateSessionQuality(
  telemetryLogs: Record<string, ItemTelemetry>,
  answers: Record<string, number | string>,
  items: SurveyItem[]
): SessionQualityResult {
  let score = 100;
  const penaltyBreakdown: string[] = [];

  // 1. Deduct 15 points for each item flagged with "speeding_suspect"
  items.forEach((item, index) => {
    const log = telemetryLogs[item.id];
    if (log && log.qualityFlags.includes("speeding_suspect")) {
      score -= 15;
      penaltyBreakdown.push(`Speeding on Question ${index + 1} (${item.id}) (-15)`);
    }
  });

  // 2. Deduct 30 points if "straight_lining" is detected across 4+ consecutive Likert items
  let hasStraightLining = false;
  const answeredLikert: number[] = [];

  for (const item of items) {
    if (item.type === "likert") {
      const val = answers[item.id];
      if (typeof val === "number") {
        answeredLikert.push(val);
      }
    }
  }

  if (answeredLikert.length >= 4) {
    let consecutiveCount = 1;
    for (let i = 1; i < answeredLikert.length; i++) {
      if (answeredLikert[i] === answeredLikert[i - 1]) {
        consecutiveCount++;
        if (consecutiveCount >= 4) {
          hasStraightLining = true;
          break;
        }
      } else {
        consecutiveCount = 1;
      }
    }
  }

  if (!hasStraightLining) {
    hasStraightLining = Object.values(telemetryLogs).some((log) =>
      log.qualityFlags.includes("straight_lining")
    );
  }

  if (hasStraightLining) {
    score -= 30;
    penaltyBreakdown.push("Straight-lining detected across 4+ consecutive Likert items (-30)");
  }

  // 3. Deduct 10 points if focusOutCount > 2 or total focusOutDurationMs > 10,000 ms
  let totalFocusOutCount = 0;
  let totalFocusOutDurationMs = 0;

  Object.values(telemetryLogs).forEach((log) => {
    totalFocusOutCount += log.focusOutCount;
    totalFocusOutDurationMs += log.focusOutDurationMs;
  });

  if (totalFocusOutCount > 2 || totalFocusOutDurationMs > 10000) {
    score -= 10;
    penaltyBreakdown.push(
      `Disengagement/Tab switching (${totalFocusOutCount} switches, ${(totalFocusOutDurationMs / 1000).toFixed(1)}s out) (-10)`
    );
  }

  // 4. Deduct 15 points if answerRevisions > 4 on a single item (erratic hesitation)
  items.forEach((item, index) => {
    const log = telemetryLogs[item.id];
    if (log && log.answerRevisions > 4) {
      score -= 15;
      penaltyBreakdown.push(
        `Erratic answer revisions on Question ${index + 1} (${log.answerRevisions} revisions) (-15)`
      );
    }
  });

  // Floor score at 0 and cap at 100
  const finalScore = Math.max(0, Math.min(100, score));

  let status: QualityStatus = "high_integrity";
  if (finalScore >= 80) {
    status = "high_integrity";
  } else if (finalScore >= 60) {
    status = "marginal";
  } else {
    status = "quarantined";
  }

  return {
    score: finalScore,
    status,
    penaltyBreakdown,
  };
}
