import { ItemTelemetry } from "@/hooks/useTelemetry";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface SubmissionPayload {
  sessionId: string;
  surveyId?: string;
  respondentEmail: string;
  deviceContext: {
    viewport: { width: number; height: number };
    isTouch: boolean;
    deviceType: string;
    presentationArm: string;
  };
  answers: Record<string, number | string>;
  telemetryLogs: Record<string, ItemTelemetry>;
  qualityResult: {
    score: number;
    status: "high_integrity" | "marginal" | "quarantined";
    penaltyBreakdown: string[];
  };
  timestamps: {
    startedAt: string;
    completedAt: string;
  };
}

export interface StoredSessionRecord extends SubmissionPayload {
  id: string;
  createdAt: string;
}

declare global {
  var __SURVEY_DB__: StoredSessionRecord[] | undefined;
  var __SUPABASE_CLIENT_INSTANCE__: SupabaseClient | undefined;
}

const INITIAL_SESSIONS: StoredSessionRecord[] = [
  {
    id: "sess_seed_001",
    sessionId: "sess_seed_001",
    surveyId: "psychometric-core-v1",
    respondentEmail: "fahim@diu.edu.bd",
    deviceContext: {
      viewport: { width: 390, height: 844 },
      isTouch: true,
      deviceType: "mobile",
      presentationArm: "single_card",
    },
    answers: {
      item_1: 4,
      item_2: 5,
      item_3: 4,
      item_4: 4,
      item_5: 5,
      item_6: "The tonal contrast made it effortless to read on a mobile screen.",
    },
    telemetryLogs: {
      item_1: {
        itemId: "item_1",
        firstInputLatencyMs: 1420,
        activeDwellTimeMs: 4100,
        scrollReversalsYFlips: 0,
        focusOutCount: 0,
        focusOutDurationMs: 0,
        answerRevisions: 0,
        qualityFlags: [],
      },
      item_2: {
        itemId: "item_2",
        firstInputLatencyMs: 950,
        activeDwellTimeMs: 3200,
        scrollReversalsYFlips: 0,
        focusOutCount: 0,
        focusOutDurationMs: 0,
        answerRevisions: 0,
        qualityFlags: [],
      },
      item_3: {
        itemId: "item_3",
        firstInputLatencyMs: 810,
        activeDwellTimeMs: 2900,
        scrollReversalsYFlips: 1,
        focusOutCount: 0,
        focusOutDurationMs: 0,
        answerRevisions: 1,
        qualityFlags: [],
      },
      item_4: {
        itemId: "item_4",
        firstInputLatencyMs: 740,
        activeDwellTimeMs: 2800,
        scrollReversalsYFlips: 0,
        focusOutCount: 0,
        focusOutDurationMs: 0,
        answerRevisions: 0,
        qualityFlags: [],
      },
      item_5: {
        itemId: "item_5",
        firstInputLatencyMs: 880,
        activeDwellTimeMs: 3400,
        scrollReversalsYFlips: 0,
        focusOutCount: 0,
        focusOutDurationMs: 0,
        answerRevisions: 0,
        qualityFlags: [],
      },
      item_6: {
        itemId: "item_6",
        firstInputLatencyMs: 1100,
        activeDwellTimeMs: 6400,
        scrollReversalsYFlips: 0,
        focusOutCount: 0,
        focusOutDurationMs: 0,
        answerRevisions: 0,
        qualityFlags: [],
      },
    },
    qualityResult: {
      score: 95,
      status: "high_integrity",
      penaltyBreakdown: [],
    },
    timestamps: {
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      completedAt: new Date(Date.now() - 3500000).toISOString(),
    },
    createdAt: new Date(Date.now() - 3500000).toISOString(),
  },
  {
    id: "sess_seed_002",
    sessionId: "sess_seed_002",
    surveyId: "psychometric-core-v1",
    respondentEmail: "anonymous",
    deviceContext: {
      viewport: { width: 1440, height: 900 },
      isTouch: false,
      deviceType: "desktop",
      presentationArm: "scrollable_list",
    },
    answers: {
      item_1: 4,
      item_2: 4,
      item_3: 4,
      item_4: 4,
      item_5: 4,
      item_6: "Quick test.",
    },
    telemetryLogs: {
      item_1: {
        itemId: "item_1",
        firstInputLatencyMs: 580,
        activeDwellTimeMs: 1050,
        scrollReversalsYFlips: 2,
        focusOutCount: 1,
        focusOutDurationMs: 1200,
        answerRevisions: 0,
        qualityFlags: ["speeding_suspect"],
      },
      item_2: {
        itemId: "item_2",
        firstInputLatencyMs: 420,
        activeDwellTimeMs: 1300,
        scrollReversalsYFlips: 1,
        focusOutCount: 0,
        focusOutDurationMs: 0,
        answerRevisions: 0,
        qualityFlags: [],
      },
      item_3: {
        itemId: "item_3",
        firstInputLatencyMs: 390,
        activeDwellTimeMs: 1250,
        scrollReversalsYFlips: 0,
        focusOutCount: 0,
        focusOutDurationMs: 0,
        answerRevisions: 0,
        qualityFlags: [],
      },
      item_4: {
        itemId: "item_4",
        firstInputLatencyMs: 360,
        activeDwellTimeMs: 1100,
        scrollReversalsYFlips: 0,
        focusOutCount: 0,
        focusOutDurationMs: 0,
        answerRevisions: 0,
        qualityFlags: ["speeding_suspect", "straight_lining"],
      },
      item_5: {
        itemId: "item_5",
        firstInputLatencyMs: 380,
        activeDwellTimeMs: 1150,
        scrollReversalsYFlips: 0,
        focusOutCount: 0,
        focusOutDurationMs: 0,
        answerRevisions: 0,
        qualityFlags: ["speeding_suspect", "straight_lining"],
      },
      item_6: {
        itemId: "item_6",
        firstInputLatencyMs: 780,
        activeDwellTimeMs: 2900,
        scrollReversalsYFlips: 0,
        focusOutCount: 0,
        focusOutDurationMs: 0,
        answerRevisions: 0,
        qualityFlags: [],
      },
    },
    qualityResult: {
      score: 55,
      status: "quarantined",
      penaltyBreakdown: [
        "Speeding on Question 1 (-15)",
        "Straight-lining detected across 4+ consecutive Likert items (-30)",
      ],
    },
    timestamps: {
      startedAt: new Date(Date.now() - 1800000).toISOString(),
      completedAt: new Date(Date.now() - 1750000).toISOString(),
    },
    createdAt: new Date(Date.now() - 1750000).toISOString(),
  },
];

if (!globalThis.__SURVEY_DB__) {
  globalThis.__SURVEY_DB__ = [...INITIAL_SESSIONS];
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function cleanSupabaseUrl(url: string | undefined): string | null {
  if (!url) return null;
  let cleaned = url.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  cleaned = cleaned.replace(/\/+$/, "");
  return cleaned.length > 0 ? cleaned : null;
}

export function cleanSupabaseKey(key: string | undefined): string | null {
  if (!key) return null;
  let cleaned = key.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Supports both:
 * 1. Legacy JWT anon keys (starts with eyJ...)
 * 2. New Supabase publishable keys (starts with sb_publishable_ or sbp_...)
 */
export function isSupportedSupabaseKey(key: string): boolean {
  return (
    key.startsWith("eyJ") ||
    key.startsWith("sb_publishable_") ||
    key.startsWith("sbp_") ||
    key.length >= 20
  );
}

export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const url = cleanSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = cleanSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (url && anonKey) {
    return { url, anonKey };
  }
  return null;
}

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config) {
    return null;
  }

  if (globalThis.__SUPABASE_CLIENT_INSTANCE__) {
    return globalThis.__SUPABASE_CLIENT_INSTANCE__;
  }

  if (!isSupportedSupabaseKey(config.anonKey)) {
    console.warn(
      "[Storage] Notice: Supabase key format does not match typical JWT ('eyJ...') or publishable ('sb_publishable_...') patterns."
    );
  }

  const client = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  globalThis.__SUPABASE_CLIENT_INSTANCE__ = client;
  return client;
}

interface SupabaseRespondentSession {
  id: string;
  survey_id: string;
  respondent_email: string;
  device_context: {
    viewport: { width: number; height: number };
    isTouch: boolean;
    deviceType: string;
    presentationArm: string;
  };
  quality_score: number;
  status: "high_integrity" | "marginal" | "quarantined";
  penalty_breakdown: string[] | null;
  started_at: string;
  completed_at: string;
  responses?: Array<{ item_id: string; answer_value: string }>;
  telemetry_logs?: Array<{
    item_id: string;
    timing_metrics?: { firstInputLatencyMs: number | null; activeDwellTimeMs: number; focusOutDurationMs: number };
    interaction_metrics?: { scrollReversalsYFlips: number; focusOutCount: number; answerRevisions: number };
    quality_flags?: string[];
  }>;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop: string | symbol) {
    const client = getSupabaseClient();
    if (!client) {
      return undefined;
    }
    const val = Reflect.get(client, prop);
    return typeof val === "function" ? (...args: unknown[]) => Reflect.apply(val, client, args) : val;
  },
});

export async function saveSubmission(
  payload: SubmissionPayload
): Promise<{ success: boolean; id: string }> {
  const newRecord: StoredSessionRecord = {
    ...payload,
    id: payload.sessionId,
    createdAt: new Date().toISOString(),
  };

  // Always write to in-memory store so dev experience is zero-latency & zero-config
  if (!globalThis.__SURVEY_DB__) {
    globalThis.__SURVEY_DB__ = [];
  }
  globalThis.__SURVEY_DB__.unshift(newRecord);

  // If Supabase client is available, write to remote PostgreSQL tables
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      // 1. Insert session record
      const sessionRowData: Record<string, unknown> = {
        survey_id: payload.surveyId || "psychometric-core-v1",
        respondent_email: payload.respondentEmail || "anonymous",
        device_context: payload.deviceContext,
        quality_score: payload.qualityResult.score,
        status: payload.qualityResult.status,
        penalty_breakdown: payload.qualityResult.penaltyBreakdown,
        started_at: payload.timestamps.startedAt,
        completed_at: payload.timestamps.completedAt,
      };

      // If sessionId is already a valid UUID, supply it directly
      if (UUID_REGEX.test(payload.sessionId)) {
        sessionRowData.id = payload.sessionId;
      }

      const { data: insertedSession, error: sessionErr } = await supabase
        .from("respondent_sessions")
        .insert(sessionRowData)
        .select("id")
        .single();

      if (sessionErr) {
        console.error("[Storage] Error inserting respondent_sessions row:", sessionErr);
      }

      const targetSessionId = insertedSession?.id || (UUID_REGEX.test(payload.sessionId) ? payload.sessionId : null);

      if (targetSessionId) {
        // 2. Insert responses
        const responseRows = Object.entries(payload.answers).map(([itemId, val]) => ({
          session_id: targetSessionId,
          item_id: itemId,
          answer_value: String(val),
        }));

        if (responseRows.length > 0) {
          const { error: respErr } = await supabase.from("responses").insert(responseRows);
          if (respErr) {
            console.error("[Storage] Error inserting responses rows:", respErr);
          }
        }

        // 3. Insert telemetry logs
        const telemetryRows = Object.values(payload.telemetryLogs).map((log) => ({
          session_id: targetSessionId,
          item_id: log.itemId,
          timing_metrics: {
            firstInputLatencyMs: log.firstInputLatencyMs,
            activeDwellTimeMs: log.activeDwellTimeMs,
            focusOutDurationMs: log.focusOutDurationMs,
          },
          interaction_metrics: {
            scrollReversalsYFlips: log.scrollReversalsYFlips,
            focusOutCount: log.focusOutCount,
            answerRevisions: log.answerRevisions,
          },
          quality_flags: log.qualityFlags || [],
        }));

        if (telemetryRows.length > 0) {
          const { error: telemErr } = await supabase.from("telemetry_logs").insert(telemetryRows);
          if (telemErr) {
            console.error("[Storage] Error inserting telemetry_logs rows:", telemErr);
          }
        }
      }
    } catch (err) {
      console.error("[Storage] Supabase remote sync error, retained in-memory:", err);
    }
  }

  return { success: true, id: newRecord.id };
}

export async function getAllSubmissions(): Promise<StoredSessionRecord[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data: rows, error } = await supabase
        .from("respondent_sessions")
        .select("*, responses(*), telemetry_logs(*)")
        .order("completed_at", { ascending: false });

      if (error) {
        console.error("[Storage] Supabase select error:", error);
      } else if (Array.isArray(rows) && rows.length > 0) {
        // Normalize Supabase rows to StoredSessionRecord
        return (rows as unknown as SupabaseRespondentSession[]).map((r) => ({
          id: r.id,
          sessionId: r.id,
          surveyId: r.survey_id,
          respondentEmail: r.respondent_email,
          deviceContext: r.device_context,
          answers: (r.responses || []).reduce(
            (acc: Record<string, string>, item: { item_id: string; answer_value: string }) => {
              acc[item.item_id] = item.answer_value;
              return acc;
            },
            {}
          ),
          telemetryLogs: (r.telemetry_logs || []).reduce(
            (
              acc: Record<string, ItemTelemetry>,
              log: {
                item_id: string;
                timing_metrics?: { firstInputLatencyMs: number | null; activeDwellTimeMs: number; focusOutDurationMs: number };
                interaction_metrics?: { scrollReversalsYFlips: number; focusOutCount: number; answerRevisions: number };
                quality_flags?: string[];
              }
            ) => {
              acc[log.item_id] = {
                itemId: log.item_id,
                firstInputLatencyMs: log.timing_metrics?.firstInputLatencyMs ?? null,
                activeDwellTimeMs: log.timing_metrics?.activeDwellTimeMs ?? 0,
                focusOutDurationMs: log.timing_metrics?.focusOutDurationMs ?? 0,
                scrollReversalsYFlips: log.interaction_metrics?.scrollReversalsYFlips ?? 0,
                focusOutCount: log.interaction_metrics?.focusOutCount ?? 0,
                answerRevisions: log.interaction_metrics?.answerRevisions ?? 0,
                qualityFlags: log.quality_flags || [],
              };
              return acc;
            },
            {}
          ),
          qualityResult: {
            score: r.quality_score,
            status: r.status,
            penaltyBreakdown: r.penalty_breakdown || [],
          },
          timestamps: {
            startedAt: r.started_at,
            completedAt: r.completed_at,
          },
          createdAt: r.completed_at,
        }));
      }
    } catch (err) {
      console.error("[Storage] Supabase fetch error, fallback to in-memory:", err);
    }
  }

  return globalThis.__SURVEY_DB__ || [];
}
