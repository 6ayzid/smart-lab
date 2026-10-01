import { NextResponse } from "next/server";
import { getAllSubmissions, StoredSessionRecord } from "@/lib/storage/db";

export async function GET() {
  try {
    const submissions: StoredSessionRecord[] = await getAllSubmissions();
    const total = submissions.length;

    if (total === 0) {
      return NextResponse.json({
        totalSubmissions: 0,
        averageQualityScore: 0,
        quarantinedCount: 0,
        deviceDistribution: { mobile: 0, desktop: 0, tablet: 0 },
        abComparison: {
          single_card: { count: 0, avgDwellTimeMs: 0, speedingRatePct: 0, meanQualityScore: 0 },
          scrollable_list: { count: 0, avgDwellTimeMs: 0, speedingRatePct: 0, meanQualityScore: 0 },
        },
        sessions: [],
      });
    }

    const totalScore = submissions.reduce((sum, s) => sum + (s.qualityResult?.score || 0), 0);
    const avgScore = Math.round(totalScore / total);

    const quarantinedCount = submissions.filter(
      (s) => s.qualityResult?.status === "quarantined" || (s.qualityResult?.score || 0) < 60
    ).length;

    // Device counts
    let mobileCount = 0;
    let desktopCount = 0;
    let tabletCount = 0;

    submissions.forEach((s) => {
      const d = s.deviceContext?.deviceType;
      if (d === "mobile") mobileCount++;
      else if (d === "tablet") tabletCount++;
      else desktopCount++;
    });

    const deviceDistribution = {
      mobile: Math.round((mobileCount / total) * 100),
      desktop: Math.round((desktopCount / total) * 100),
      tablet: Math.round((tabletCount / total) * 100),
    };

    // A/B Presentation comparison
    const armA = submissions.filter((s) => s.deviceContext?.presentationArm === "single_card");
    const armB = submissions.filter((s) => s.deviceContext?.presentationArm === "scrollable_list");

    const computeArmMetrics = (cohort: StoredSessionRecord[]) => {
      if (cohort.length === 0) {
        return { count: 0, avgDwellTimeMs: 0, speedingRatePct: 0, meanQualityScore: 0 };
      }

      let totalDwell = 0;
      let totalItemsCount = 0;
      let speedingFlagsCount = 0;
      let totalQuality = 0;

      cohort.forEach((s) => {
        totalQuality += s.qualityResult?.score || 0;
        const logs = Object.values(s.telemetryLogs || {});
        logs.forEach((log) => {
          totalDwell += log.activeDwellTimeMs || 0;
          totalItemsCount++;
          if (log.qualityFlags?.includes("speeding_suspect")) {
            speedingFlagsCount++;
          }
        });
      });

      const avgDwell = totalItemsCount > 0 ? Math.round(totalDwell / totalItemsCount) : 0;
      const speedingRate = totalItemsCount > 0 ? Math.round((speedingFlagsCount / totalItemsCount) * 100) : 0;
      const meanQuality = Math.round(totalQuality / cohort.length);

      return {
        count: cohort.length,
        avgDwellTimeMs: avgDwell,
        speedingRatePct: speedingRate,
        meanQualityScore: meanQuality,
      };
    };

    const abComparison = {
      single_card: computeArmMetrics(armA),
      scrollable_list: computeArmMetrics(armB),
    };

    return NextResponse.json({
      totalSubmissions: total,
      averageQualityScore: avgScore,
      quarantinedCount,
      deviceDistribution,
      abComparison,
      sessions: submissions,
    });
  } catch (err) {
    console.error("[API /api/analytics] Error computing metrics:", err);
    return NextResponse.json(
      { error: "Failed to generate analytics metrics" },
      { status: 500 }
    );
  }
}
