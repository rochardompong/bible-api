import type { ScrapeProgress, ScrapePhase } from "../../types/index.d";
import { r2Get, r2Put } from "./r2";

const PROGRESS_KEY = "state/progress.json";

const DEFAULT_PROGRESS: ScrapeProgress = {
  schema_version: 1,
  last_run: new Date().toISOString(),
  current_phase: "init",
  phase_progress: {
    bible_index: 0,
    book_index: 0,
    chapter_index: 0,
    verse_index: 0,
  },
  selected_bible_ids: [],
  completed_phases: [],
  requests_this_session: 0,
  total_requests_made: 0,
};

let _progress: ScrapeProgress | null = null;

export async function loadProgress(): Promise<ScrapeProgress> {
  _progress = (await r2Get<ScrapeProgress>(PROGRESS_KEY)) ?? {
    ...DEFAULT_PROGRESS,
  };
  console.log(`[Progress] Phase: ${_progress.current_phase} | Total requests: ${_progress.total_requests_made}`);
  return _progress;
}

export async function saveProgress(
  updates: Partial<ScrapeProgress>
): Promise<void> {
  if (!_progress) throw new Error("Progress not loaded");
  _progress = {
    ..._progress,
    ...updates,
    last_run: new Date().toISOString(),
  };
  await r2Put(PROGRESS_KEY, _progress);
}

export function getProgress(): ScrapeProgress {
  if (!_progress) throw new Error("Progress not loaded");
  return _progress;
}

export async function advancePhase(next: ScrapePhase): Promise<void> {
  const p = getProgress();
  await saveProgress({
    current_phase: next,
    completed_phases: [...p.completed_phases, p.current_phase],
    phase_progress: {
      bible_index: 0,
      book_index: 0,
      chapter_index: 0,
      verse_index: 0,
    },
  });
  console.log(`[Phase] Advanced to: ${next}`);
}
