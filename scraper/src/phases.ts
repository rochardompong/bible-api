import type {
  Bible,
  BibleCollection,
  BibleIndex,
  Book,
  Chapter,
  Language,
  LanguageCollection,
  Verse,
  VerseData,
  VotdYear,
} from "../../types/index.d";

import { r2Exists, r2Put } from "./r2";
import { yvFetch, yvFetchAll, isSessionBudgetExhausted } from "./yvApi";
import { advancePhase, getProgress, saveProgress } from "./progress";

// ============================================================
// PHASE 0 — Init: fetch all bibles, select top 50
// ============================================================

export async function phaseInit(): Promise<void> {
  console.log("[Phase 0] Fetching Bible list to select top 50...");

  const allBibles = await yvFetchAll<Bible>("/v1/bibles");

  // Save the full bible collection mirror
  await r2Put("v1/bibles.json", { data: allBibles, total_size: allBibles.length });

  // Select 50: prefer bibles with the most books (complete bibles),
  // spread across unique languages. Sort by book count desc, then slice.
  const seen = new Set<string>();
  const top50: Bible[] = [];

  // First pass: one Bible per unique language_tag (most complete)
  const byLang = new Map<string, Bible>();
  for (const b of allBibles) {
    const existing = byLang.get(b.language_tag);
    if (!existing || b.books.length > existing.books.length) {
      byLang.set(b.language_tag, b);
    }
  }

  // Sort languages by book count (most complete first)
  const sorted = [...byLang.values()].sort((a, b) => b.books.length - a.books.length);

  for (const b of sorted) {
    if (top50.length >= 50) break;
    top50.push(b);
    seen.add(b.language_tag);
  }

  // Second pass: fill remaining slots with additional English/popular translations
  if (top50.length < 50) {
    for (const b of allBibles) {
      if (top50.length >= 50) break;
      if (!top50.find((x) => x.id === b.id)) {
        top50.push(b);
      }
    }
  }

  const selectedIds = top50.map((b) => b.id);
  await r2Put("state/selected-bibles.json", { selected: top50, ids: selectedIds });

  console.log(`[Phase 0] Selected ${top50.length} Bibles across ${seen.size} languages.`);
  await saveProgress({ selected_bible_ids: selectedIds });
  await advancePhase("languages");
}

// ============================================================
// PHASE 1 — Languages
// ============================================================

export async function phaseLanguages(): Promise<void> {
  console.log("[Phase 1] Fetching all languages...");

  const langs = await yvFetchAll<Language>("/v1/languages");
  await r2Put("v1/languages.json", { data: langs, total_size: langs.length });

  // Fetch individual language detail for each language in our 50 bibles
  const p = getProgress();

  // Get language tags from selected bibles
  const selectedBibles = await (async () => {
    const { r2Get } = await import("./r2");
    const sel = await r2Get<{ selected: Bible[] }>("state/selected-bibles.json");
    return sel?.selected ?? [];
  })();

  const langTags = [...new Set(selectedBibles.map((b) => b.language_tag))];

  for (const lang of langs.filter((l) => langTags.includes(l.iso_639_1))) {
    if (isSessionBudgetExhausted()) {
      await saveProgress({});
      return;
    }
    const key = `v1/languages/${lang.id}.json`;
    if (await r2Exists(key)) continue;
    const detail = await yvFetch<Language>(`/v1/languages/${lang.id}`);
    if (detail) await r2Put(key, detail);
  }

  await advancePhase("bible_metadata");
}

// ============================================================
// PHASE 2 — Bible metadata (individual bible detail)
// ============================================================

export async function phaseBibleMetadata(): Promise<void> {
  console.log("[Phase 2] Fetching individual Bible metadata...");
  const { selected_bible_ids } = getProgress();

  for (let i = 0; i < selected_bible_ids.length; i++) {
    if (isSessionBudgetExhausted()) {
      await saveProgress({ phase_progress: { bible_index: i, book_index: 0, chapter_index: 0, verse_index: 0 } });
      return;
    }
    const id = selected_bible_ids[i];
    const key = `v1/bibles/${id}.json`;
    if (await r2Exists(key)) continue;
    const bible = await yvFetch<Bible>(`/v1/bibles/${id}`);
    if (bible) await r2Put(key, bible);
  }

  await advancePhase("votd");
}

// ============================================================
// PHASE 3 — VOTD (Verse of the Day) for current + next year
// ============================================================

export async function phaseVotd(): Promise<void> {
  console.log("[Phase 3] Fetching Verse of the Day calendars...");

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1];

  for (const year of years) {
    if (isSessionBudgetExhausted()) return;
    const key = `v1/verse-of-the-days/${year}.json`;
    if (await r2Exists(key)) continue;
    const votd = await yvFetch<VotdYear>(`/v1/verse-of-the-days/${year}`);
    if (votd) {
      await r2Put(key, votd);

      // Also cache individual day files (mirrors /v1/verse-of-the-days/{day})
      if (votd.data) {
        for (const day of votd.data) {
          if (isSessionBudgetExhausted()) return;
          const dayKey = `v1/verse-of-the-days/${year}/${day.day}.json`;
          if (!(await r2Exists(dayKey))) {
            await r2Put(dayKey, day);
          }
        }
      }
    }
  }

  await advancePhase("books");
}

// ============================================================
// PHASE 4 — Books for all selected bibles
// ============================================================

export async function phaseBooks(): Promise<void> {
  console.log("[Phase 4] Fetching Books for all Bibles...");
  const { selected_bible_ids, phase_progress } = getProgress();

  for (let i = phase_progress.bible_index; i < selected_bible_ids.length; i++) {
    if (isSessionBudgetExhausted()) {
      await saveProgress({ phase_progress: { ...phase_progress, bible_index: i } });
      return;
    }
    const bibleId = selected_bible_ids[i];

    // Collection endpoint — /v1/bibles/{id}/books
    const collKey = `v1/bibles/${bibleId}/books.json`;
    let books: Book[] = [];

    if (await r2Exists(collKey)) {
      const cached = await (await import("./r2")).r2Get<{ data: Book[] }>(collKey);
      books = cached?.data ?? [];
    } else {
      books = await yvFetchAll<Book>(`/v1/bibles/${bibleId}/books`);
      await r2Put(collKey, { data: books, total_size: books.length });
    }

    // Individual book detail — /v1/bibles/{id}/books/{book_id}
    for (const book of books) {
      if (isSessionBudgetExhausted()) {
        await saveProgress({ phase_progress: { ...phase_progress, bible_index: i } });
        return;
      }
      const bookKey = `v1/bibles/${bibleId}/books/${book.usfm}.json`;
      if (await r2Exists(bookKey)) continue;
      const detail = await yvFetch<Book>(`/v1/bibles/${bibleId}/books/${book.usfm}`);
      if (detail) await r2Put(bookKey, detail);
    }
  }

  await advancePhase("chapters");
}

// ============================================================
// PHASE 5 — Chapters for all books
// ============================================================

export async function phaseChapters(): Promise<void> {
  console.log("[Phase 5] Fetching Chapters...");
  const { selected_bible_ids, phase_progress } = getProgress();
  const { r2Get } = await import("./r2");

  for (let bi = phase_progress.bible_index; bi < selected_bible_ids.length; bi++) {
    const bibleId = selected_bible_ids[bi];
    const booksData = await r2Get<{ data: Book[] }>(`v1/bibles/${bibleId}/books.json`);
    const books = booksData?.data ?? [];

    const startBook = bi === phase_progress.bible_index ? phase_progress.book_index : 0;

    for (let bki = startBook; bki < books.length; bki++) {
      if (isSessionBudgetExhausted()) {
        await saveProgress({ phase_progress: { bible_index: bi, book_index: bki, chapter_index: 0, verse_index: 0 } });
        return;
      }
      const book = books[bki];

      // Collection: /v1/bibles/{id}/chapters (filtered by book)
      const collKey = `v1/bibles/${bibleId}/books/${book.usfm}/chapters.json`;
      let chapters: Chapter[] = [];

      if (await r2Exists(collKey)) {
        const cached = await r2Get<{ data: Chapter[] }>(collKey);
        chapters = cached?.data ?? [];
      } else {
        chapters = await yvFetchAll<Chapter>(`/v1/bibles/${bibleId}/chapters`, {
          book_usfm: book.usfm,
        });
        await r2Put(collKey, { data: chapters, total_size: chapters.length });
      }

      // Individual chapter: /v1/bibles/{id}/chapters/{chapter_id}
      for (const ch of chapters) {
        if (isSessionBudgetExhausted()) {
          await saveProgress({ phase_progress: { bible_index: bi, book_index: bki, chapter_index: 0, verse_index: 0 } });
          return;
        }
        const chKey = `v1/bibles/${bibleId}/chapters/${ch.usfm}.json`;
        if (await r2Exists(chKey)) continue;
        const detail = await yvFetch<Chapter>(`/v1/bibles/${bibleId}/chapters/${ch.usfm}`);
        if (detail) await r2Put(chKey, detail);
      }
    }
    if (isSessionBudgetExhausted()) return;
  }

  await advancePhase("verses_list");
}

// ============================================================
// PHASE 6 — Verse list per chapter
// ============================================================

export async function phaseVersesList(): Promise<void> {
  console.log("[Phase 6] Fetching Verse lists...");
  const { selected_bible_ids, phase_progress } = getProgress();
  const { r2Get } = await import("./r2");

  for (let bi = phase_progress.bible_index; bi < selected_bible_ids.length; bi++) {
    const bibleId = selected_bible_ids[bi];
    const booksData = await r2Get<{ data: Book[] }>(`v1/bibles/${bibleId}/books.json`);
    const books = booksData?.data ?? [];
    const startBook = bi === phase_progress.bible_index ? phase_progress.book_index : 0;

    for (let bki = startBook; bki < books.length; bki++) {
      const book = books[bki];
      const chapData = await r2Get<{ data: Chapter[] }>(`v1/bibles/${bibleId}/books/${book.usfm}/chapters.json`);
      const chapters = chapData?.data ?? [];
      const startCh = (bi === phase_progress.bible_index && bki === phase_progress.book_index)
        ? phase_progress.chapter_index : 0;

      for (let chi = startCh; chi < chapters.length; chi++) {
        if (isSessionBudgetExhausted()) {
          await saveProgress({ phase_progress: { bible_index: bi, book_index: bki, chapter_index: chi, verse_index: 0 } });
          return;
        }
        const ch = chapters[chi];
        const key = `v1/bibles/${bibleId}/chapters/${ch.usfm}/verses.json`;
        if (await r2Exists(key)) continue;
        const verses = await yvFetchAll<Verse>(`/v1/bibles/${bibleId}/verses`, {
          chapter_usfm: ch.usfm,
        });
        if (verses.length > 0) await r2Put(key, { data: verses, total_size: verses.length });
      }
    }
  }

  await advancePhase("verses_text");
}

// ============================================================
// PHASE 7 — Verse text (the big one — runs for months)
// ============================================================

export async function phaseVersesText(): Promise<void> {
  console.log("[Phase 7] Fetching verse text content...");
  const { selected_bible_ids, phase_progress } = getProgress();
  const { r2Get } = await import("./r2");

  for (let bi = phase_progress.bible_index; bi < selected_bible_ids.length; bi++) {
    const bibleId = selected_bible_ids[bi];
    const booksData = await r2Get<{ data: Book[] }>(`v1/bibles/${bibleId}/books.json`);
    const books = booksData?.data ?? [];
    const startBook = bi === phase_progress.bible_index ? phase_progress.book_index : 0;

    for (let bki = startBook; bki < books.length; bki++) {
      const book = books[bki];
      const chapData = await r2Get<{ data: Chapter[] }>(`v1/bibles/${bibleId}/books/${book.usfm}/chapters.json`);
      const chapters = chapData?.data ?? [];
      const startCh = (bi === phase_progress.bible_index && bki === phase_progress.book_index)
        ? phase_progress.chapter_index : 0;

      for (let chi = startCh; chi < chapters.length; chi++) {
        const ch = chapters[chi];

        // Passage-level fetch (full chapter text) — 1 request per chapter
        const passageKey = `v1/bibles/${bibleId}/passages/${ch.usfm}.json`;
        if (isSessionBudgetExhausted()) {
          await saveProgress({ phase_progress: { bible_index: bi, book_index: bki, chapter_index: chi, verse_index: 0 } });
          return;
        }
        if (!(await r2Exists(passageKey))) {
          const passage = await yvFetch<VerseData>(`/v1/bibles/${bibleId}/passages/${ch.usfm}`);
          if (passage) await r2Put(passageKey, passage);
        }

        // Individual verse text
        const verseListData = await r2Get<{ data: Verse[] }>(`v1/bibles/${bibleId}/chapters/${ch.usfm}/verses.json`);
        const verses = verseListData?.data ?? [];
        const startVerse = (bi === phase_progress.bible_index && bki === phase_progress.book_index && chi === phase_progress.chapter_index)
          ? phase_progress.verse_index : 0;

        for (let vi = startVerse; vi < verses.length; vi++) {
          if (isSessionBudgetExhausted()) {
            await saveProgress({ phase_progress: { bible_index: bi, book_index: bki, chapter_index: chi, verse_index: vi } });
            return;
          }
          const verse = verses[vi];
          const verseKey = `v1/bibles/${bibleId}/verses/${verse.usfm}.json`;
          if (await r2Exists(verseKey)) continue;
          const detail = await yvFetch<VerseData>(`/v1/bibles/${bibleId}/verses/${verse.usfm}`);
          if (detail) await r2Put(verseKey, detail);
        }
      }
    }
  }

  // Also fetch full Bible index after all verse text is done
  for (const bibleId of selected_bible_ids) {
    if (isSessionBudgetExhausted()) return;
    const indexKey = `v1/bibles/${bibleId}/index.json`;
    if (await r2Exists(indexKey)) continue;
    const index = await yvFetch<BibleIndex>(`/v1/bibles/${bibleId}/index`);
    if (index) await r2Put(indexKey, index);
  }

  await advancePhase("done");
  console.log("🎉 All phases complete!");
}
