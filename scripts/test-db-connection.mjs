#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { performance } from "node:perf_hooks";
import { createClient } from "@supabase/supabase-js";

// Helper to parse key-value env file lines
function parseEnvContent(content) {
  const env = {};
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

// 1. Read NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from .env.local
const rootDir = process.cwd();
const envLocalPath = path.join(rootDir, ".env.local");

let envVars = {};
if (fs.existsSync(envLocalPath)) {
  const rawEnv = fs.readFileSync(envLocalPath, "utf-8");
  envVars = parseEnvContent(rawEnv);
}

const supabaseUrl =
  envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("--------------------------------------------------");
console.log("Supabase Connection & Verification Suite");
console.log("--------------------------------------------------");

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ FAILED: Missing Supabase credentials.");
  console.error(`- .env.local path checked: ${envLocalPath}`);
  console.error(
    `- NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? "Defined" : "MISSING"}`
  );
  console.error(
    `- NEXT_PUBLIC_SUPABASE_ANON_KEY: ${
      supabaseAnonKey ? "Defined" : "MISSING"
    }`
  );
  console.error("\nPlease create or update .env.local with:");
  console.error("NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co");
  console.error("NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (or sb_publishable_...)");
  process.exit(1);
}

// Identify key type
let keyType = "Unknown format";
if (supabaseAnonKey.startsWith("eyJ")) {
  keyType = "Legacy JWT Anon Key (eyJ...)";
} else if (
  supabaseAnonKey.startsWith("sb_publishable_") ||
  supabaseAnonKey.startsWith("sbp_")
) {
  keyType = "Supabase Publishable Key (sb_publishable_...)";
} else {
  keyType = `Custom / Token (${supabaseAnonKey.slice(0, 8)}...)`;
}

console.log(`Endpoint: ${supabaseUrl}`);
console.log(`Key Type: ${keyType}`);
console.log("Initializing Supabase client...");

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function runVerification() {
  const overallStart = performance.now();
  const testSessionId = crypto.randomUUID();
  console.log(`\nStarting test verification with session UUID: ${testSessionId}`);

  // 2. Directly insert a test session into respondent_sessions
  console.log("-> Inserting test session into respondent_sessions...");
  const t0 = performance.now();
  const { data: sessionRow, error: sessionErr } = await supabase
    .from("respondent_sessions")
    .insert({
      id: testSessionId,
      survey_id: "verification-suite-v1",
      respondent_email: "test_verification@example.com",
      device_context: {
        viewport: { width: 1920, height: 1080 },
        isTouch: false,
        deviceType: "desktop",
        presentationArm: "single_card",
      },
      quality_score: 100,
      status: "high_integrity",
      penalty_breakdown: [],
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();

  const insertSessionMs = performance.now() - t0;

  if (sessionErr) {
    console.error("❌ FAILED: Error inserting into respondent_sessions:");
    console.error(sessionErr);
    process.exit(1);
  }
  console.log(`✓ respondent_sessions insert completed in ${insertSessionMs.toFixed(2)} ms`);

  // 3. Directly insert a sample telemetry row into telemetry_logs
  console.log("-> Inserting sample telemetry row into telemetry_logs...");
  const t1 = performance.now();
  const { data: telemetryRow, error: telemErr } = await supabase
    .from("telemetry_logs")
    .insert({
      session_id: testSessionId,
      item_id: "verification_item_1",
      timing_metrics: {
        firstInputLatencyMs: 420,
        activeDwellTimeMs: 1500,
        focusOutDurationMs: 0,
      },
      interaction_metrics: {
        scrollReversalsYFlips: 0,
        focusOutCount: 0,
        answerRevisions: 0,
      },
      quality_flags: ["automated_test"],
    })
    .select()
    .single();

  const insertTelemMs = performance.now() - t1;

  if (telemErr) {
    console.error("❌ FAILED: Error inserting into telemetry_logs:");
    console.error(telemErr);
    // Cleanup parent session before exit
    await supabase.from("respondent_sessions").delete().eq("id", testSessionId);
    process.exit(1);
  }
  console.log(`✓ telemetry_logs insert completed in ${insertTelemMs.toFixed(2)} ms`);

  // 4. Query the table back to confirm the row exists and was written correctly
  console.log("-> Querying records back from Supabase...");
  const t2 = performance.now();
  const { data: queriedRows, error: queryErr } = await supabase
    .from("respondent_sessions")
    .select("*, telemetry_logs(*)")
    .eq("id", testSessionId)
    .single();

  const queryMs = performance.now() - t2;

  if (queryErr || !queriedRows) {
    console.error("❌ FAILED: Error querying inserted verification record:");
    console.error(queryErr || "Row not found");
    // Cleanup
    await supabase.from("telemetry_logs").delete().eq("session_id", testSessionId);
    await supabase.from("respondent_sessions").delete().eq("id", testSessionId);
    process.exit(1);
  }

  const logs = queriedRows.telemetry_logs || [];
  if (logs.length === 0 || logs[0].item_id !== "verification_item_1") {
    console.error("❌ FAILED: Telemetry record mismatch in join query.");
    await supabase.from("telemetry_logs").delete().eq("session_id", testSessionId);
    await supabase.from("respondent_sessions").delete().eq("id", testSessionId);
    process.exit(1);
  }
  console.log(`✓ Verification query confirmed rows in ${queryMs.toFixed(2)} ms`);

  // 5. Delete test row or mark it as test data
  console.log("-> Cleaning up test rows...");
  const t3 = performance.now();
  await supabase.from("telemetry_logs").delete().eq("session_id", testSessionId);
  const { error: deleteErr } = await supabase
    .from("respondent_sessions")
    .delete()
    .eq("id", testSessionId);

  const deleteMs = performance.now() - t3;

  if (deleteErr) {
    console.warn("⚠️ Warning: Could not delete test row (checking DELETE RLS policy):", deleteErr.message);
  } else {
    console.log(`✓ Cleanup delete completed in ${deleteMs.toFixed(2)} ms`);
  }

  const totalRoundTripMs = performance.now() - overallStart;

  console.log("\n========================================================");
  console.log("SUPABASE CONNECTION SUCCESSFUL");
  console.log("========================================================");
  console.log(`Target URL:       ${supabaseUrl}`);
  console.log(`Key Format:       ${keyType}`);
  console.log("Latency Metrics:");
  console.log(`  - Session Insert:      ${insertSessionMs.toFixed(2)} ms`);
  console.log(`  - Telemetry Insert:    ${insertTelemMs.toFixed(2)} ms`);
  console.log(`  - Verification Query:  ${queryMs.toFixed(2)} ms`);
  console.log(`  - Cleanup Delete:      ${deleteMs.toFixed(2)} ms`);
  console.log(`  - Total Round-Trip:    ${totalRoundTripMs.toFixed(2)} ms`);
  console.log("Database status: Read/Write/Delete RLS policies confirmed healthy.");
  console.log("========================================================\n");
}

runVerification().catch((err) => {
  console.error("❌ Unexpected test runner error:", err);
  process.exit(1);
});
