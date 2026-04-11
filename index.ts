import { loadProgress, getProgress, saveProgress } from "./progress";
import { getSessionRequestCount, isSessionBudgetExhausted } from "./yvApi";
import { r2Get, r2Put } from "./r2";
import {
  phaseInit,
  phaseLanguages,
  phaseBibleMetadata,
  phaseVotd,
  phaseBooks,
  phaseChapters,
  phaseVersesList,
  phaseVersesText,
} from "./phases";
import type { FailedRequest } from "../../types/index";

// ============================================================
// Validate required environment variables
// ============================================================

const REQUIRED_ENV = [
  "YV_APP_KEY",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// ============================================================
// Retry previously failed requests
// ============================================================

async function retryFailedRequests(): Promise<void> {
  const FAILED_KEY = "state/failed-requests.json";
  const failed = await r2Get<FailedRequest[]>(FAILED_KEY);
  if (!failed || failed.length === 0) return;

  console.log(`[Retry] ${failed.length} previously failed requests found.`);
  const stillFailed: FailedRequest[] = [];

  for (const item of failed) {
    if (isSessionBudgetExhausted()) {
      stillFailed.push(...failed.slice(failed.indexOf(item)));
      break;
    }

    try {
      const res = await fetch(item.url, {
        headers: {
          "X-YVP-App-Key": process.env.YV_APP_KEY!,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (res.ok) {
        const data = await res.json();
        await r2Put(item.r2_key, data);
        console.log(`[Retry] ✅ Recovered: ${item.url}`);
      } else {
        stillFailed.push({ ...item, attempts: item.attempts + 1, last_attempt: new Date().toISOString() });
      }
    } catch {
      stillFailed.push({ ...item, attempts: item.attempts + 1, last_attempt: new Date().toISOString() });
    }
  }

  await r2Put(FAILED_KEY, stillFailed);
  console.log(`[Retry] Done. ${stillFailed.length} still failing.`);
}

// ============================================================
// Phase dispatcher
// ============================================================

async function runCurrentPhase(): Promise<void> {
  const { current_phase } = getProgress();

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Running Phase: ${current_phase}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  switch (current_phase) {
    case "init":           return phaseInit();
    case "languages":      return phaseLanguages();
    case "bible_metadata": return phaseBibleMetadata();
    case "votd":           return phaseVotd();
    case "books":          return phaseBooks();
    case "chapters":       return phaseChapters();
    case "verses_list":    return phaseVersesList();
    case "verses_text":    return phaseVersesText();
    case "done":
      console.log("✅ All data has been scraped. Nothing to do.");
      return;
    default:
      console.error(`Unknown phase: ${current_phase}`);
      process.exit(1);
  }
}

// ============================================================
// Main
// ============================================================

async function main(): Promise<void> {
  const startTime = Date.now();
  console.log(`\n🔍 Bible Mirror Scraper — ${new Date().toISOString()}`);

  const progress = await loadProgress();

  if (progress.current_phase === "done") {
    console.log("✅ Scraping complete. Nothing more to fetch.");
    return;
  }

  // Step 1: retry any previously failed requests first
  await retryFailedRequests();

  // Step 2: run the current phase
  await runCurrentPhase();

  // Step 3: save session stats
  const requestsThisSession = getSessionRequestCount();
  await saveProgress({
    requests_this_session: requestsThisSession,
    total_requests_made: progress.total_requests_made + requestsThisSession,
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Session complete.`);
  console.log(`   Requests this session: ${requestsThisSession}`);
  console.log(`   Total requests made: ${progress.total_requests_made + requestsThisSession}`);
  console.log(`   Time elapsed: ${elapsed}s`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
