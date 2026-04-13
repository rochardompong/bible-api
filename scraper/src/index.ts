import { loadProgress, getProgress, saveProgress } from "./progress";
import { getSessionRequestCount, isSessionBudgetExhausted } from "./yvApi";
import { r2Get, r2Put } from "./r2";
import {
  phaseInit, phaseLanguages, phaseBibleMetadata, phaseVotd,
  phaseBooks, phaseChapters, phaseVersesList, phaseVersesText,
} from "./phases";
import type { FailedRequest } from "@bible-mirror/types";

const REQUIRED_ENV = ["YV_APP_KEY","R2_ACCOUNT_ID","R2_ACCESS_KEY_ID","R2_SECRET_ACCESS_KEY","R2_BUCKET_NAME"];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) { console.error(`Missing env: ${key}`); process.exit(1); }
}

async function retryFailedRequests(): Promise<void> {
  const KEY = "state/failed-requests.json";
  const failed = await r2Get<FailedRequest[]>(KEY);
  if (!failed || failed.length === 0) return;
  console.log(`[Retry] ${failed.length} failed requests.`);
  const stillFailed: FailedRequest[] = [];
  for (const item of failed) {
    if (isSessionBudgetExhausted()) { stillFailed.push(...failed.slice(failed.indexOf(item))); break; }
    try {
      const res = await fetch(item.url, {
        headers: { "X-YVP-App-Key": process.env.YV_APP_KEY!, Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) { await r2Put(item.r2_key, await res.json()); console.log(`[Retry] OK: ${item.url}`); }
      else stillFailed.push({ ...item, attempts: item.attempts + 1, last_attempt: new Date().toISOString() });
    } catch {
      stillFailed.push({ ...item, attempts: item.attempts + 1, last_attempt: new Date().toISOString() });
    }
  }
  await r2Put(KEY, stillFailed);
}

async function runCurrentPhase(): Promise<void> {
  const { current_phase } = getProgress();
  console.log(`\n[Phase] Running: ${current_phase}\n`);
  switch (current_phase) {
    case "init":           return phaseInit();
    case "languages":      return phaseLanguages();
    case "bible_metadata": return phaseBibleMetadata();
    case "votd":           return phaseVotd();
    case "books":          return phaseBooks();
    case "chapters":       return phaseChapters();
    case "verses_list":    return phaseVersesList();
    case "verses_text":    return phaseVersesText();
    case "done": console.log("All done. Nothing to do."); return;
    default: console.error(`Unknown phase: ${current_phase}`); process.exit(1);
  }
}

async function main(): Promise<void> {
  const t0 = Date.now();
  console.log(`Bible Mirror Scraper — ${new Date().toISOString()}`);
  const progress = await loadProgress();
  if (progress.current_phase === "done") { console.log("Scraping complete."); return; }
  await retryFailedRequests();
  await runCurrentPhase();
  const req = getSessionRequestCount();
  await saveProgress({ requests_this_session: req, total_requests_made: progress.total_requests_made + req });
  console.log(`\nDone. ${req} req this session | ${((Date.now()-t0)/1000).toFixed(1)}s`);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
