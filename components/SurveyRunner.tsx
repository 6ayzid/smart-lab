"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { Survey, SurveyItem } from "@/lib/data/defaultSurvey";
import { useTelemetry, ItemTelemetry } from "@/hooks/useTelemetry";
import { calculateSessionQuality } from "@/lib/utils/qualityScore";
import { exportRawParadataCsv, exportCleanedDatasetCsv, SessionExportMetadata } from "@/lib/utils/exportCsv";
import { getDeviceContext, PresentationArm, DeviceType } from "@/lib/utils/deviceContext";

interface SurveyRunnerProps {
  survey: Survey;
}

type SurveyStage = "welcome" | "running" | "completed";

function isValidUniversityEmail(email: string): boolean {
  if (!email.trim()) return true;
  const clean = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(clean)) return false;

  const domain = clean.split("@")[1];
  if (!domain) return false;

  return (
    domain === "diu.edu.bd" ||
    domain.endsWith(".diu.edu.bd") ||
    domain.endsWith(".edu") ||
    domain.includes(".edu.") ||
    domain.includes(".ac.")
  );
}

export default function SurveyRunner({ survey }: SurveyRunnerProps) {
  // Session & Device Context
  const [sessionId, setSessionId] = useState(() => `sess_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`);
  const [sessionStartTime, setSessionStartTime] = useState(() => new Date().toISOString());
  const [viewport, setViewport] = useState({ width: 1200, height: 800 });
  const [deviceType, setDeviceType] = useState<DeviceType>("desktop");
  const [presentationArm, setPresentationArm] = useState<PresentationArm>("single_card");

  // Lifecycle Stage & Loading
  const [stage, setStage] = useState<SurveyStage>("welcome");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Entry Gate Form State
  const [email, setEmail] = useState("");
  const isEmailValid = useMemo(() => isValidUniversityEmail(email), [email]);

  // Response & Telemetry State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [telemetryLogs, setTelemetryLogs] = useState<Record<string, ItemTelemetry>>({});

  // Initialize device context once mounted
  useEffect(() => {
    const ctx = getDeviceContext();
    setViewport(ctx.viewport);
    setDeviceType(ctx.deviceType);
    setPresentationArm(ctx.presentationArm);

    const handleResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const totalItems = survey.items.length;
  const currentItem: SurveyItem | undefined = survey.items[currentIndex];

  const currentAnswer = currentItem ? answers[currentItem.id] : undefined;
  const isCurrentAnswered =
    currentAnswer !== undefined &&
    currentAnswer !== "" &&
    (typeof currentAnswer !== "string" || currentAnswer.trim().length > 0);

  // Hook for Mode A (Single Card paging)
  const { registerAnswerChange: registerAnswerChangeModeA, flushTelemetry: flushTelemetryModeA } = useTelemetry({
    itemId: currentItem ? currentItem.id : "",
    prompt: currentItem ? currentItem.prompt : "",
  });

  // Trackers for Mode B (Scrollable List)
  const modeBStartTimeRef = useRef<number>(0);
  const modeBFirstInputsRef = useRef<Record<string, number | null>>({});
  const modeBRevisionsRef = useRef<Record<string, number>>({});
  const modeBInitialAnsweredRef = useRef<Record<string, boolean>>({});
  const modeBDwellTimesRef = useRef<Record<string, number>>({});
  const modeBVisibleItemsRef = useRef<Set<string>>(new Set());
  const modeBLastActiveTimestampRef = useRef<number>(0);
  const modeBIsTabActiveRef = useRef<boolean>(true);
  const modeBFocusOutCountRef = useRef<number>(0);
  const modeBFocusOutDurationRef = useRef<number>(0);
  const modeBBlurTimestampRef = useRef<number | null>(null);
  const modeBScrollReversalsRef = useRef<number>(0);
  const modeBLastScrollYRef = useRef<number>(0);
  const modeBLastScrollDirectionRef = useRef<"up" | "down" | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Mode B Lifecycle & Event Listeners
  useEffect(() => {
    if (stage !== "running" || presentationArm !== "scrollable_list") return;

    const now = performance.now();
    modeBStartTimeRef.current = now;
    modeBLastActiveTimestampRef.current = now;
    modeBIsTabActiveRef.current = !document.hidden && document.hasFocus();
    modeBFocusOutCountRef.current = 0;
    modeBFocusOutDurationRef.current = 0;
    modeBScrollReversalsRef.current = 0;
    modeBLastScrollYRef.current = window.scrollY;

    survey.items.forEach((item) => {
      modeBFirstInputsRef.current[item.id] = null;
      modeBRevisionsRef.current[item.id] = 0;
      modeBInitialAnsweredRef.current[item.id] = false;
      modeBDwellTimesRef.current[item.id] = 0;
    });

    const handleVisibility = () => {
      const ts = performance.now();
      if (document.hidden) {
        if (modeBIsTabActiveRef.current) {
          const elapsed = ts - modeBLastActiveTimestampRef.current;
          modeBVisibleItemsRef.current.forEach((id) => {
            modeBDwellTimesRef.current[id] = (modeBDwellTimesRef.current[id] || 0) + elapsed;
          });
          modeBIsTabActiveRef.current = false;
          modeBBlurTimestampRef.current = ts;
        }
      } else {
        if (!modeBIsTabActiveRef.current) {
          if (modeBBlurTimestampRef.current !== null) {
            modeBFocusOutDurationRef.current += ts - modeBBlurTimestampRef.current;
            modeBFocusOutCountRef.current += 1;
            modeBBlurTimestampRef.current = null;
          }
          modeBLastActiveTimestampRef.current = ts;
          modeBIsTabActiveRef.current = true;
        }
      }
    };

    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - modeBLastScrollYRef.current;
      if (Math.abs(delta) >= 3) {
        if (delta > 0) {
          modeBLastScrollDirectionRef.current = "down";
        } else if (delta < 0) {
          if (modeBLastScrollDirectionRef.current === "down") {
            modeBScrollReversalsRef.current += 1;
          }
          modeBLastScrollDirectionRef.current = "up";
        }
        modeBLastScrollYRef.current = currentY;
      }
    };

    const dwellInterval = setInterval(() => {
      if (modeBIsTabActiveRef.current) {
        const ts = performance.now();
        const delta = ts - modeBLastActiveTimestampRef.current;
        modeBVisibleItemsRef.current.forEach((id) => {
          modeBDwellTimesRef.current[id] = (modeBDwellTimesRef.current[id] || 0) + delta;
        });
        modeBLastActiveTimestampRef.current = ts;
      }
    }, 100);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const itemId = entry.target.getAttribute("data-item-id");
          if (!itemId) return;
          if (entry.isIntersecting) {
            modeBVisibleItemsRef.current.add(itemId);
          } else {
            modeBVisibleItemsRef.current.delete(itemId);
          }
        });
      },
      { threshold: 0.3 }
    );

    survey.items.forEach((item) => {
      const el = itemRefs.current[item.id];
      if (el) observer.observe(el);
    });

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      clearInterval(dwellInterval);
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [stage, presentationArm, survey.items]);

  // Answer handlers for Mode A
  const handleSelectOptionModeA = (optionId: number) => {
    if (!currentItem) return;
    registerAnswerChangeModeA();
    setAnswers((prev) => ({
      ...prev,
      [currentItem.id]: optionId,
    }));
  };

  const handleTextChangeModeA = (value: string) => {
    if (!currentItem) return;
    registerAnswerChangeModeA();
    setAnswers((prev) => ({
      ...prev,
      [currentItem.id]: value,
    }));
  };

  // Answer handlers for Mode B
  const handleSelectOptionModeB = (itemId: string, optionId: number) => {
    const now = performance.now();
    if (modeBFirstInputsRef.current[itemId] === null) {
      modeBFirstInputsRef.current[itemId] = Math.max(0, Math.round(now - modeBStartTimeRef.current));
    }

    if (!modeBInitialAnsweredRef.current[itemId]) {
      modeBInitialAnsweredRef.current[itemId] = true;
    } else {
      modeBRevisionsRef.current[itemId] = (modeBRevisionsRef.current[itemId] || 0) + 1;
    }

    setAnswers((prev) => ({
      ...prev,
      [itemId]: optionId,
    }));
  };

  const handleTextChangeModeB = (itemId: string, value: string) => {
    const now = performance.now();
    if (modeBFirstInputsRef.current[itemId] === null) {
      modeBFirstInputsRef.current[itemId] = Math.max(0, Math.round(now - modeBStartTimeRef.current));
    }

    if (!modeBInitialAnsweredRef.current[itemId]) {
      modeBInitialAnsweredRef.current[itemId] = true;
    } else {
      modeBRevisionsRef.current[itemId] = (modeBRevisionsRef.current[itemId] || 0) + 1;
    }

    setAnswers((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  };

  // Central submission dispatcher
  const submitSurveyToServer = async (
    finalAnswers: Record<string, number | string>,
    finalLogs: Record<string, ItemTelemetry>
  ) => {
    setIsSubmitting(true);
    const completedAt = new Date().toISOString();
    const quality = calculateSessionQuality(finalLogs, finalAnswers, survey.items);

    const payload = {
      sessionId,
      surveyId: survey.id,
      respondentEmail: email.trim() || "anonymous",
      deviceContext: {
        viewport,
        isTouch: typeof navigator !== "undefined" && navigator.maxTouchPoints > 0,
        deviceType,
        presentationArm,
      },
      answers: finalAnswers,
      telemetryLogs: finalLogs,
      qualityResult: quality,
      timestamps: {
        startedAt: sessionStartTime,
        completedAt,
      },
    };

    try {
      await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("[SurveyRunner] API submission error:", err);
    } finally {
      setIsSubmitting(false);
      setStage("completed");
    }
  };

  // Next / Submit for Mode A
  const handleNextOrSubmitModeA = async () => {
    if (!currentItem) return;

    const snapshot = flushTelemetryModeA();
    const updatedAnswers = {
      ...answers,
      [currentItem.id]: answers[currentItem.id],
    };

    const answeredLikert: { itemId: string; value: number }[] = [];
    for (let i = 0; i <= currentIndex; i++) {
      const it = survey.items[i];
      if (it.type === "likert") {
        const val = updatedAnswers[it.id];
        if (typeof val === "number") {
          answeredLikert.push({ itemId: it.id, value: val });
        }
      }
    }

    const updatedLogs = { ...telemetryLogs };

    if (answeredLikert.length >= 4) {
      const lastFour = answeredLikert.slice(-4);
      const allSameValue = lastFour.every((entry) => entry.value === lastFour[0].value);
      if (allSameValue) {
        if (!snapshot.qualityFlags.includes("straight_lining")) {
          snapshot.qualityFlags.push("straight_lining");
        }
        for (const entry of lastFour) {
          if (updatedLogs[entry.itemId] && !updatedLogs[entry.itemId].qualityFlags.includes("straight_lining")) {
            updatedLogs[entry.itemId] = {
              ...updatedLogs[entry.itemId],
              qualityFlags: [...updatedLogs[entry.itemId].qualityFlags, "straight_lining"],
            };
          }
        }
      }
    }

    updatedLogs[currentItem.id] = snapshot;
    setTelemetryLogs(updatedLogs);

    if (currentIndex < totalItems - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      await submitSurveyToServer(updatedAnswers, updatedLogs);
    }
  };

  const handlePreviousModeA = () => {
    if (currentIndex > 0) {
      flushTelemetryModeA();
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Submit for Mode B (Scrollable List)
  const handleSubmitModeB = async () => {
    const finalLogs: Record<string, ItemTelemetry> = {};

    const answeredLikert: { itemId: string; value: number }[] = [];
    survey.items.forEach((item) => {
      if (item.type === "likert" && typeof answers[item.id] === "number") {
        answeredLikert.push({ itemId: item.id, value: answers[item.id] as number });
      }
    });

    let hasStraightLining = false;
    if (answeredLikert.length >= 4) {
      let count = 1;
      for (let i = 1; i < answeredLikert.length; i++) {
        if (answeredLikert[i].value === answeredLikert[i - 1].value) {
          count++;
          if (count >= 4) {
            hasStraightLining = true;
            break;
          }
        } else {
          count = 1;
        }
      }
    }

    survey.items.forEach((item) => {
      const dwellMs = Math.round(modeBDwellTimesRef.current[item.id] || 0);
      const wordCount = item.prompt.trim().split(/\s+/).filter(Boolean).length;
      const flags: string[] = [];

      if (wordCount > 5 && dwellMs < 1200) {
        flags.push("speeding_suspect");
      }
      if (hasStraightLining && item.type === "likert") {
        flags.push("straight_lining");
      }

      finalLogs[item.id] = {
        itemId: item.id,
        firstInputLatencyMs: modeBFirstInputsRef.current[item.id] ?? null,
        activeDwellTimeMs: dwellMs,
        scrollReversalsYFlips: modeBScrollReversalsRef.current,
        focusOutCount: modeBFocusOutCountRef.current,
        focusOutDurationMs: modeBFocusOutDurationRef.current,
        answerRevisions: modeBRevisionsRef.current[item.id] || 0,
        qualityFlags: flags,
      };
    });

    setTelemetryLogs(finalLogs);
    await submitSurveyToServer(answers, finalLogs);
  };

  // Reset entire survey session
  const handleReset = () => {
    setAnswers({});
    setTelemetryLogs({});
    setCurrentIndex(0);
    setSessionId(`sess_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`);
    setSessionStartTime(new Date().toISOString());
    setStage("welcome");
  };

  // Session Quality Scoring on Completed stage
  const qualityResult = useMemo(() => {
    if (stage !== "completed") return null;
    return calculateSessionQuality(telemetryLogs, answers, survey.items);
  }, [stage, telemetryLogs, answers, survey.items]);

  const exportMetadata: SessionExportMetadata = {
    respondentEmail: email.trim() || "anonymous",
    deviceType,
    viewport: `${viewport.width}x${viewport.height}`,
    presentationArm,
  };

  const handleDownloadCleaned = () => {
    if (!qualityResult) return;
    exportCleanedDatasetCsv(sessionId, survey, answers, qualityResult.score, exportMetadata);
  };

  const handleDownloadRaw = () => {
    if (!qualityResult) return;
    exportRawParadataCsv(sessionId, survey, answers, telemetryLogs, qualityResult.score, exportMetadata);
  };

  // -------------------------------------------------------------
  // STAGE 1: PRE-SURVEY ENTRY SCREEN (WELCOME)
  // -------------------------------------------------------------
  if (stage === "welcome") {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-xl bg-surface-container-low rounded-3xl p-8">
          <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant mb-2">
            Research Study Entry Gate
          </p>
          <h1 className="text-2xl font-normal text-on-surface tracking-tight mb-3">
            {survey.title}
          </h1>
          <p className="text-on-surface-variant text-base mb-6">
            {survey.description}
          </p>

          {/* Ethical Consent Disclosure */}
          <div className="bg-surface-container-high rounded-2xl p-4 text-on-surface-variant text-sm mb-6 leading-relaxed">
            <p className="font-medium text-on-surface mb-1">Informed Consent & Passive Paradata Disclosure</p>
            <p>
              This study passively records anonymous interaction timing, scrolling, and focus patterns to research mobile
              survey interfaces. No personal keystrokes or passwords are collected.
            </p>
          </div>

          {/* Optional Campus Email Gate */}
          <div className="flex flex-col gap-2 mb-6">
            <label className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
              Campus Identification (Optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Optional: student@diu.edu.bd (for verified research credit)"
              className="bg-surface-container-high text-on-surface rounded-2xl p-4 w-full placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-highest transition-all duration-200 text-sm"
            />
            {!isEmailValid && (
              <p className="text-xs text-on-surface-variant font-medium mt-1">
                Please enter a valid campus email ending with @diu.edu.bd or recognized .edu domain, or leave blank to proceed anonymously.
              </p>
            )}
          </div>

          {/* Research Mode Selector (Dev/A/B Override) */}
          <div className="flex flex-col gap-2 mb-8">
            <label className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
              Presentation Arm Selector (A/B Test)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPresentationArm("single_card")}
                className={`rounded-2xl p-4 text-left transition-all duration-200 cursor-pointer ${
                  presentationArm === "single_card"
                    ? "bg-primary-container text-on-primary-container font-medium"
                    : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                }`}
              >
                <p className="text-sm font-medium">Arm A: Paced Card</p>
                <p className="text-xs opacity-75 mt-0.5">One item at a time</p>
              </button>

              <button
                type="button"
                onClick={() => setPresentationArm("scrollable_list")}
                className={`rounded-2xl p-4 text-left transition-all duration-200 cursor-pointer ${
                  presentationArm === "scrollable_list"
                    ? "bg-primary-container text-on-primary-container font-medium"
                    : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                }`}
              >
                <p className="text-sm font-medium">Arm B: Full-Page Form</p>
                <p className="text-xs opacity-75 mt-0.5">All 6 items scrollable</p>
              </button>
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Device detected: {deviceType} ({viewport.width}x{viewport.height})
            </p>
          </div>

          {/* Start Survey Action */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setSessionStartTime(new Date().toISOString());
                setStage("running");
              }}
              disabled={!isEmailValid}
              className="rounded-full bg-primary text-on-primary px-8 py-3.5 text-sm font-medium hover:opacity-90 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Start Survey
            </button>
          </div>
        </div>
      </main>
    );
  }

  // -------------------------------------------------------------
  // STAGE 2: SURVEY EXECUTION (MODE A OR MODE B)
  // -------------------------------------------------------------
  if (stage === "running") {
    // Mode A: Single-Card Paging Engine
    if (presentationArm === "single_card") {
      if (!currentItem) return null;
      const isLastQuestion = currentIndex === totalItems - 1;

      return (
        <main className="min-h-screen bg-surface flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-surface-container-low rounded-3xl p-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-on-surface-variant">
                Question {currentIndex + 1} of {totalItems}
              </span>
              <span className="text-xs font-medium text-on-surface-variant">
                {Math.round(((currentIndex + 1) / totalItems) * 100)}%
              </span>
            </div>

            <div className="w-full h-1 bg-surface-container-high rounded-full overflow-hidden mb-8">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / totalItems) * 100}%` }}
              />
            </div>

            <h1 className="text-2xl font-normal text-on-surface tracking-tight mb-8">
              {currentItem.prompt}
            </h1>

            {currentItem.type === "likert" && currentItem.options && (
              <div className="flex flex-col gap-3">
                {currentItem.options.map((option) => {
                  const isSelected = currentAnswer === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelectOptionModeA(option.id)}
                      className={`w-full text-left rounded-2xl p-4 transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? "bg-primary-container text-on-primary-container font-medium"
                          : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            )}

            {currentItem.type === "open_text" && (
              <div>
                <textarea
                  value={(currentAnswer as string) || ""}
                  onChange={(e) => handleTextChangeModeA(e.target.value)}
                  placeholder="Type your response here..."
                  rows={4}
                  className="w-full bg-surface-container-high text-on-surface placeholder:text-on-surface-variant rounded-2xl p-4 transition-all duration-200 resize-none focus:outline-none focus:bg-surface-container-highest text-base"
                />
              </div>
            )}

            <div className="mt-8 flex items-center justify-between">
              {currentIndex > 0 ? (
                <button
                  type="button"
                  onClick={handlePreviousModeA}
                  className="rounded-full bg-surface-container-high text-on-surface-variant px-6 py-3.5 text-sm font-medium hover:bg-surface-container-highest transition-all duration-200 cursor-pointer"
                >
                  Previous
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={handleNextOrSubmitModeA}
                disabled={!isCurrentAnswered || isSubmitting}
                className="rounded-full bg-primary text-on-primary px-8 py-3.5 text-sm font-medium hover:opacity-90 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Saving..." : isLastQuestion ? "Submit" : "Next"}
              </button>
            </div>
          </div>
        </main>
      );
    }

    // Mode B: Full-Page Scrollable Form
    const allAnswered = survey.items.every((item) => {
      const ans = answers[item.id];
      return ans !== undefined && ans !== "" && (typeof ans !== "string" || ans.trim().length > 0);
    });

    return (
      <main className="min-h-screen bg-surface flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-xl bg-surface-container-low rounded-3xl p-8 flex flex-col gap-8">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                Full-Page Form Mode (Arm B)
              </span>
              <span className="text-xs font-medium text-on-surface-variant">
                {Object.keys(answers).length} of {totalItems} answered
              </span>
            </div>
            <h1 className="text-2xl font-normal text-on-surface tracking-tight">
              {survey.title}
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Please review and answer all questions below before submitting.
            </p>
          </div>

          <div className="flex flex-col gap-8">
            {survey.items.map((item, idx) => {
              const itemAnswer = answers[item.id];

              return (
                <div
                  key={item.id}
                  ref={(el) => {
                    itemRefs.current[item.id] = el;
                  }}
                  data-item-id={item.id}
                  className="bg-surface-container-high rounded-2xl p-6"
                >
                  <p className="text-xs font-medium text-on-surface-variant mb-2">
                    Question {idx + 1} of {totalItems}
                  </p>
                  <h2 className="text-lg font-normal text-on-surface tracking-tight mb-4">
                    {item.prompt}
                  </h2>

                  {item.type === "likert" && item.options && (
                    <div className="flex flex-col gap-2.5">
                      {item.options.map((option) => {
                        const isSelected = itemAnswer === option.id;

                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handleSelectOptionModeB(item.id, option.id)}
                            className={`w-full text-left rounded-xl p-3.5 transition-all duration-200 cursor-pointer ${
                              isSelected
                                ? "bg-primary-container text-on-primary-container font-medium"
                                : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-highest"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {item.type === "open_text" && (
                    <textarea
                      value={(itemAnswer as string) || ""}
                      onChange={(e) => handleTextChangeModeB(item.id, e.target.value)}
                      placeholder="Type your response here..."
                      rows={4}
                      className="w-full bg-surface-container-low text-on-surface placeholder:text-on-surface-variant rounded-xl p-4 transition-all duration-200 resize-none focus:outline-none focus:bg-surface-container-highest text-base"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSubmitModeB}
              disabled={!allAnswered || isSubmitting}
              className="rounded-full bg-primary text-on-primary px-8 py-3.5 text-sm font-medium hover:opacity-90 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Saving..." : "Submit Survey"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // -------------------------------------------------------------
  // STAGE 3: SURVEY COMPLETION & METRICS INSPECTION
  // -------------------------------------------------------------
  if (stage === "completed" && qualityResult) {
    const statusLabel =
      qualityResult.status === "high_integrity"
        ? "High Integrity"
        : qualityResult.status === "marginal"
        ? "Marginal"
        : "Quarantined";

    return (
      <main className="min-h-screen bg-surface flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-2xl bg-surface-container-low rounded-3xl p-8">
          <p className="text-sm font-medium text-on-surface-variant mb-2">
            Assessment Completed
          </p>
          <h1 className="text-2xl font-normal text-on-surface tracking-tight mb-2">
            Thank you for completing the survey.
          </h1>
          <p className="text-on-surface-variant mb-6 text-base">
            All responses, paradata metrics, and integrity scores have been recorded.
          </p>

          {/* Session Metadata Banner */}
          <div className="bg-surface-container-high rounded-2xl p-4 mb-8 flex flex-wrap items-center gap-3 text-xs">
            <div className="bg-surface-container-low px-3 py-1.5 rounded-xl">
              <span className="text-on-surface-variant">Respondent: </span>
              <span className="font-medium text-on-surface">{email.trim() || "Anonymous"}</span>
            </div>
            <div className="bg-surface-container-low px-3 py-1.5 rounded-xl">
              <span className="text-on-surface-variant">Arm: </span>
              <span className="font-medium text-on-surface">
                {presentationArm === "single_card" ? "Arm A (Paced Card)" : "Arm B (Scrollable Form)"}
              </span>
            </div>
            <div className="bg-surface-container-low px-3 py-1.5 rounded-xl">
              <span className="text-on-surface-variant">Device: </span>
              <span className="font-medium text-on-surface">
                {deviceType} ({viewport.width}x{viewport.height})
              </span>
            </div>
          </div>

          {/* Section 1: Session Integrity Card */}
          <div className="bg-surface-container-high rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant mb-1">
                  Session Integrity Score
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-normal text-on-surface tracking-tight">
                    {qualityResult.score}
                  </span>
                  <span className="text-base text-on-surface-variant">/100</span>
                </div>
              </div>
              <span className="bg-primary-container text-on-primary-container text-xs font-medium px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                {statusLabel}
              </span>
            </div>

            {qualityResult.penaltyBreakdown.length > 0 ? (
              <div className="mt-4 flex flex-col gap-2">
                <p className="text-xs font-medium text-on-surface-variant">
                  Deductions Applied:
                </p>
                {qualityResult.penaltyBreakdown.map((penalty, idx) => (
                  <div
                    key={idx}
                    className="bg-surface-container-low rounded-xl px-3.5 py-2 text-xs text-on-surface font-normal"
                  >
                    {penalty}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant mt-2 font-normal">
                No satisficing behaviors detected. Perfect 100/100 integrity.
              </p>
            )}
          </div>

          {/* Section 2: Answer Summary */}
          <div className="flex flex-col gap-3 mb-8">
            <h2 className="text-lg font-medium text-on-surface">
              Responses Summary
            </h2>
            {survey.items.map((item, idx) => {
              const answer = answers[item.id];
              let answerDisplay = "Not answered";

              if (item.type === "likert") {
                const opt = item.options?.find((o) => o.id === answer);
                answerDisplay = opt ? opt.label : "Not answered";
              } else if (typeof answer === "string" && answer.trim()) {
                answerDisplay = answer;
              }

              return (
                <div
                  key={item.id}
                  className="bg-surface-container-high rounded-2xl p-4"
                >
                  <p className="text-xs font-medium text-on-surface-variant mb-1">
                    Question {idx + 1}
                  </p>
                  <p className="text-sm text-on-surface mb-2 font-normal">
                    {item.prompt}
                  </p>
                  <p className="text-sm font-medium text-on-primary-container bg-primary-container inline-block px-3 py-1 rounded-xl">
                    {answerDisplay}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Section 3: Paradata Telemetry Inspector */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-on-surface mb-3">
              Paradata Telemetry Inspector
            </h2>
            <div className="bg-surface-container-high rounded-2xl p-4">
              <div className="flex flex-col gap-3">
                {survey.items.map((item, idx) => {
                  const log = telemetryLogs[item.id];
                  if (!log) {
                    return null;
                  }

                  const hasSpeeding = log.qualityFlags.includes("speeding_suspect");
                  const hasStraightLining = log.qualityFlags.includes("straight_lining");

                  return (
                    <div
                      key={item.id}
                      className="bg-surface-container-low rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-on-surface-variant">
                          Item {idx + 1} ({item.id})
                        </span>
                        <div className="flex items-center gap-2">
                          {hasSpeeding && (
                            <span className="bg-primary-container text-on-primary-container text-xs font-medium px-2.5 py-0.5 rounded-full">
                              speeding_suspect
                            </span>
                          )}
                          {hasStraightLining && (
                            <span className="bg-primary-container text-on-primary-container text-xs font-medium px-2.5 py-0.5 rounded-full">
                              straight_lining
                            </span>
                          )}
                          {!hasSpeeding && !hasStraightLining && (
                            <span className="bg-surface-container-highest text-on-surface-variant text-xs font-medium px-2.5 py-0.5 rounded-full">
                              normal
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        <div className="bg-surface-container-high p-2 rounded-lg">
                          <p className="text-on-surface-variant font-normal">First Latency</p>
                          <p className="text-on-surface font-medium mt-0.5">
                            {log.firstInputLatencyMs !== null ? `${log.firstInputLatencyMs} ms` : "N/A"}
                          </p>
                        </div>

                        <div className="bg-surface-container-high p-2 rounded-lg">
                          <p className="text-on-surface-variant font-normal">Active Dwell</p>
                          <p className="text-on-surface font-medium mt-0.5">
                            {(log.activeDwellTimeMs / 1000).toFixed(2)} s
                          </p>
                        </div>

                        <div className="bg-surface-container-high p-2 rounded-lg">
                          <p className="text-on-surface-variant font-normal">Answer Revisions</p>
                          <p className="text-on-surface font-medium mt-0.5">
                            {log.answerRevisions}
                          </p>
                        </div>

                        <div className="bg-surface-container-high p-2 rounded-lg">
                          <p className="text-on-surface-variant font-normal">Tab Switches</p>
                          <p className="text-on-surface font-medium mt-0.5">
                            {log.focusOutCount} ({log.focusOutDurationMs} ms)
                          </p>
                        </div>

                        <div className="bg-surface-container-high p-2 rounded-lg">
                          <p className="text-on-surface-variant font-normal">Scroll Reversals</p>
                          <p className="text-on-surface font-medium mt-0.5">
                            {log.scrollReversalsYFlips}
                          </p>
                        </div>

                        <div className="bg-surface-container-high p-2 rounded-lg">
                          <p className="text-on-surface-variant font-normal">Total Flags</p>
                          <p className="text-on-surface font-medium mt-0.5">
                            {log.qualityFlags.length > 0 ? log.qualityFlags.join(", ") : "None"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 4: Action Buttons (CSV Downloads & Restart) */}
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleDownloadCleaned}
                  className="bg-primary text-on-primary rounded-full px-6 py-3 text-sm font-medium hover:opacity-90 transition-all duration-200 cursor-pointer"
                >
                  Download Cleaned CSV
                </button>

                <button
                  type="button"
                  onClick={handleDownloadRaw}
                  className="bg-surface-container-high text-on-surface rounded-full px-6 py-3 text-sm font-medium hover:bg-surface-container-highest transition-all duration-200 cursor-pointer"
                >
                  Download Raw Paradata
                </button>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="rounded-full bg-surface-container-high text-on-surface-variant px-6 py-3 text-sm font-medium hover:bg-surface-container-highest transition-all duration-200 cursor-pointer"
              >
                Restart Survey
              </button>
            </div>

            {/* Researcher Analytics Dashboard Link */}
            <div className="pt-2 text-center sm:text-left">
              <Link
                href="/analytics"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface transition-all duration-200 underline"
              >
                View Researcher Analytics Dashboard →
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return null;
}
