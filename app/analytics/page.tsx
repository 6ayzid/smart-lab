"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StoredSessionRecord } from "@/lib/storage/db";

interface AnalyticsData {
  totalSubmissions: number;
  averageQualityScore: number;
  quarantinedCount: number;
  deviceDistribution: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
  abComparison: {
    single_card: {
      count: number;
      avgDwellTimeMs: number;
      speedingRatePct: number;
      meanQualityScore: number;
    };
    scrollable_list: {
      count: number;
      avgDwellTimeMs: number;
      speedingRatePct: number;
      meanQualityScore: number;
    };
  };
  sessions: StoredSessionRecord[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/analytics");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("[Analytics] Error loading metrics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="bg-surface-container-low rounded-3xl p-8 max-w-sm text-center">
          <p className="text-sm font-medium text-on-surface">Loading research analytics...</p>
        </div>
      </main>
    );
  }

  const analytics = data || {
    totalSubmissions: 0,
    averageQualityScore: 0,
    quarantinedCount: 0,
    deviceDistribution: { mobile: 0, desktop: 0, tablet: 0 },
    abComparison: {
      single_card: { count: 0, avgDwellTimeMs: 0, speedingRatePct: 0, meanQualityScore: 0 },
      scrollable_list: { count: 0, avgDwellTimeMs: 0, speedingRatePct: 0, meanQualityScore: 0 },
    },
    sessions: [],
  };

  const quarantinedRate =
    analytics.totalSubmissions > 0
      ? Math.round((analytics.quarantinedCount / analytics.totalSubmissions) * 100)
      : 0;

  return (
    <main className="min-h-screen bg-surface p-4 sm:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        {/* Top Back Navigation */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface transition-all duration-200"
          >
            ← Back to Survey
          </Link>
        </div>

        {/* Header with Title and CSV Exports */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-normal text-on-surface tracking-tight">
              Survey Cohort Analytics
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Real-time psychometric integrity and telemetry breakdown.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/api/export?type=cleaned"
              download="master_cleaned_dataset.csv"
              className="rounded-full bg-primary text-on-primary px-5 py-2.5 text-xs font-medium hover:opacity-90 transition-all duration-200 cursor-pointer"
            >
              Download Master Cleaned CSV
            </a>
            <a
              href="/api/export?type=raw"
              download="master_raw_paradata.csv"
              className="rounded-full bg-surface-container-high text-on-surface px-5 py-2.5 text-xs font-medium hover:bg-surface-container-highest transition-all duration-200 cursor-pointer"
            >
              Download Master Paradata CSV
            </a>
          </div>
        </div>

        {/* Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1: Total Submissions */}
          <div className="bg-surface-container-low rounded-3xl p-6 flex flex-col justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant mb-2">
              Total Submissions
            </p>
            <div>
              <p className="text-3xl font-normal text-on-surface tracking-tight">
                {analytics.totalSubmissions}
              </p>
              <p className="text-xs text-on-surface-variant mt-1">
                Completed session records
              </p>
            </div>
          </div>

          {/* Card 2: Average Integrity Score */}
          <div className="bg-surface-container-low rounded-3xl p-6 flex flex-col justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant mb-2">
              Average Integrity Score
            </p>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-normal text-on-surface tracking-tight">
                  {analytics.averageQualityScore}
                </span>
                <span className="text-base text-on-surface-variant">/100</span>
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                Cohort psychometric mean
              </p>
            </div>
          </div>

          {/* Card 3: Quarantined / Flagged Count */}
          <div className="bg-surface-container-low rounded-3xl p-6 flex flex-col justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant mb-2">
              Quarantined Sessions
            </p>
            <div>
              <p className="text-3xl font-normal text-on-surface tracking-tight">
                {analytics.quarantinedCount}
              </p>
              <div className="mt-1">
                <span className="bg-primary-container text-on-primary-container text-xs font-medium px-2 py-0.5 rounded-full">
                  {quarantinedRate}% of cohort (&lt;60)
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Device Distribution */}
          <div className="bg-surface-container-low rounded-3xl p-6 flex flex-col justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant mb-2">
              Device Distribution
            </p>
            <div>
              <p className="text-xl font-normal text-on-surface tracking-tight">
                {analytics.deviceDistribution.mobile}% Mobile
              </p>
              <p className="text-xs text-on-surface-variant mt-1">
                {analytics.deviceDistribution.desktop}% Desktop · {analytics.deviceDistribution.tablet}% Tablet
              </p>
            </div>
          </div>
        </div>

        {/* Presentation Arm A/B Comparison Card */}
        <div className="bg-surface-container-low rounded-3xl p-6">
          <h2 className="text-lg font-medium text-on-surface mb-1">
            Presentation Arm A/B Comparison
          </h2>
          <p className="text-xs text-on-surface-variant mb-6">
            Controlled evaluation of Paced Single Card (Arm A) vs. Full-Page Scrollable Form (Arm B).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Arm A */}
            <div className="bg-surface-container-high rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-on-surface">
                  Arm A: Paced Single Card
                </span>
                <span className="text-xs font-medium bg-surface-container-low px-2.5 py-1 rounded-full text-on-surface-variant">
                  {analytics.abComparison.single_card.count} sessions
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-surface-container-low p-3 rounded-xl">
                  <p className="text-on-surface-variant">Active Dwell</p>
                  <p className="text-on-surface font-medium text-sm mt-1">
                    {(analytics.abComparison.single_card.avgDwellTimeMs / 1000).toFixed(1)}s
                  </p>
                </div>
                <div className="bg-surface-container-low p-3 rounded-xl">
                  <p className="text-on-surface-variant">Speeding Rate</p>
                  <p className="text-on-surface font-medium text-sm mt-1">
                    {analytics.abComparison.single_card.speedingRatePct}%
                  </p>
                </div>
                <div className="bg-surface-container-low p-3 rounded-xl">
                  <p className="text-on-surface-variant">Mean Score</p>
                  <p className="text-on-surface font-medium text-sm mt-1">
                    {analytics.abComparison.single_card.meanQualityScore}/100
                  </p>
                </div>
              </div>
            </div>

            {/* Arm B */}
            <div className="bg-surface-container-high rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-on-surface">
                  Arm B: Full-Page Form
                </span>
                <span className="text-xs font-medium bg-surface-container-low px-2.5 py-1 rounded-full text-on-surface-variant">
                  {analytics.abComparison.scrollable_list.count} sessions
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-surface-container-low p-3 rounded-xl">
                  <p className="text-on-surface-variant">Active Dwell</p>
                  <p className="text-on-surface font-medium text-sm mt-1">
                    {(analytics.abComparison.scrollable_list.avgDwellTimeMs / 1000).toFixed(1)}s
                  </p>
                </div>
                <div className="bg-surface-container-low p-3 rounded-xl">
                  <p className="text-on-surface-variant">Speeding Rate</p>
                  <p className="text-on-surface font-medium text-sm mt-1">
                    {analytics.abComparison.scrollable_list.speedingRatePct}%
                  </p>
                </div>
                <div className="bg-surface-container-low p-3 rounded-xl">
                  <p className="text-on-surface-variant">Mean Score</p>
                  <p className="text-on-surface font-medium text-sm mt-1">
                    {analytics.abComparison.scrollable_list.meanQualityScore}/100
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submissions Roster */}
        <div className="bg-surface-container-low rounded-3xl p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-on-surface">
              Completed Submissions Roster
            </h2>
            <button
              type="button"
              onClick={fetchAnalytics}
              className="text-xs font-medium text-on-surface-variant hover:text-on-surface transition-all duration-200 bg-surface-container-high px-3 py-1.5 rounded-full cursor-pointer"
            >
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-on-surface-variant uppercase tracking-wider font-medium">
                  <th className="p-3 bg-surface-container-high rounded-l-xl">Session</th>
                  <th className="p-3 bg-surface-container-high">Respondent</th>
                  <th className="p-3 bg-surface-container-high">Device</th>
                  <th className="p-3 bg-surface-container-high">Arm</th>
                  <th className="p-3 bg-surface-container-high">Score</th>
                  <th className="p-3 bg-surface-container-high rounded-r-xl">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {analytics.sessions.map((session) => {
                  const score = session.qualityResult?.score ?? 100;
                  const status = session.qualityResult?.status || "high_integrity";
                  const arm =
                    session.deviceContext?.presentationArm === "single_card"
                      ? "Arm A (Card)"
                      : "Arm B (Form)";

                  const dateDisplay = session.timestamps?.completedAt
                    ? new Date(session.timestamps.completedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Recent";

                  return (
                    <tr
                      key={session.id || session.sessionId}
                      className="hover:bg-surface-container-high/50 transition-colors"
                    >
                      <td className="p-3 font-mono text-on-surface">
                        {session.sessionId.slice(0, 13)}
                      </td>
                      <td className="p-3 text-on-surface">
                        {session.respondentEmail || "anonymous"}
                      </td>
                      <td className="p-3 text-on-surface-variant capitalize">
                        {session.deviceContext?.deviceType || "desktop"}
                      </td>
                      <td className="p-3 text-on-surface-variant">
                        {arm}
                      </td>
                      <td className="p-3">
                        <span className="bg-primary-container text-on-primary-container font-medium px-2.5 py-1 rounded-full text-xs">
                          {score}/100 ({status})
                        </span>
                      </td>
                      <td className="p-3 text-on-surface-variant">
                        {dateDisplay}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
