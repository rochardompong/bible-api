import type {
  Bible, BibleIndex, Book, Chapter,
  Language, Verse, VerseData, VotdYear,
} from "@bible-mirror/types";
import { r2Get, r2Exists, r2Put } from "./r2";
import { yvFetch, yvFetchAll, isSessionBudgetExhausted } from "./yvApi";
import { advancePhase, getProgress, saveProgress } from "./progress";

// PHASE 0 — Init
export async function phaseInit(): Promise<void> {
  console.log("[Phase 0] Selecting 50 Bibles...");
  const allBibles = await yvFetchAll<Bible>("/v1/bibles");
  await r2Put("v1/bibles.json", { data: allBibles, total_size: allBibles.length });

  const byLang = new Map<string, Bible>();
  for (const b of allBibles) {
    const ex = byLang.get(b.language_tag);
    if (!ex || b.books.length > ex.books.length) byLang.set(b.language_tag, b);
  }
  const sorted = [...byLang.values()].sort((a, b) => b.books.length - a.books.length);
  const top50: Bible[] = sorted.slice(0, 50);
  if (top50.length < 50) {
    for (const b of allBibles) {
      if (top50.length >= 50) break;
      if (!top50.find((x) => x.id === b.id)) top50.push(b);
    }
  }
  const selectedIds = top50.map((b) => b.id);
  await r2Put("state/selected-bibles.json", { selected: top50, ids: selectedIds });
  console.log(`[Phase 0] Selected ${top50.length} Bibles.`);
  await saveProgress({ selected_bible_ids: selectedIds });
  await advancePhase("languages");
}

// PHASE 1 — Languages
export async function phaseLanguages(): Promise<void> {
  console.log("[Phase 1] Fetching languages...");
  const langs = await yvFetchAll<Language>("/v1/languages");
  await r2Put("v1/languages.json", { data: langs, total_size: langs.length });

  const sel = await r2Get<{ selected: Bible[] }>("state/selected-bibles.json");
  const tags = [...new Set((sel?.selected ?? []).map((b) => b.language_tag))];

  for (const lang of langs.filter((l) => tags.includes(l.iso_639_1))) {
    if (isSessionBudgetExhausted()) { await saveProgress({}); return; }
    const key = `v1/languages/${lang.id}.json`;
    if (await r2Exists(key)) continue;
    const detail = await yvFetch<Language>(`/v1/languages/${lang.id}`);
    if (detail) await r2Put(key, detail);
  }
  await advancePhase("bible_metadata");
}

// PHASE 2 — Bible metadata
export async function phaseBibleMetadata(): Promise<void> {
  console.log("[Phase 2] Fetching Bible metadata...");
  const { selected_bible_ids, phase_progress } = getProgress();
  for (let i = phase_progress.bible_index; i < selected_bible_ids.length; i++) {
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

// PHASE 3 — VOTD
export async function phaseVotd(): Promise<void> {
  console.log("[Phase 3] Fetching VOTD...");
  const currentYear = new Date().getFullYear();
  for (const year of [currentYear, currentYear + 1]) {
    if (isSessionBudgetExhausted()) return;
    const key = `v1/verse-of-the-days/${year}.json`;
    if (await r2Exists(key)) continue;
    const votd = await yvFetch<VotdYear>(`/v1/verse-of-the-days/${year}`);
    if (votd) {
      await r2Put(key, votd);
      if (votd.data) {
        for (const day of votd.data) {
          if (isSessionBudgetExhausted()) return;
          const dk = `v1/verse-of-the-days/${year}/${day.day}.json`;
          if (!(await r2Exists(dk))) await r2Put(dk, day);
        }
      }
    }
  }
  await advancePhase("books");
}

// PHASE 4 — Books
export async function phaseBooks(): Promise<void> {
  console.log("[Phase 4] Fetching Books...");
  const { selected_bible_ids, phase_progress } = getProgress();
  for (let i = phase_progress.bible_index; i < selected_bible_ids.length; i++) {
    if (isSessionBudgetExhausted()) {
      await saveProgress({ phase_progress: { ...phase_progress, bible_index: i } });
      return;
    }
    const bibleId = selected_bible_ids[i];
    const collKey = `v1/bibles/${bibleId}/books.json`;
    let books: Book[] = [];
    if (await r2Exists(collKey)) {
      books = (await r2Get<{ data: Book[] }>(collKey))?.data ?? [];
    } else {
      books = await yvFetchAll<Book>(`/v1/bibles/${bibleId}/books`);
      await r2Put(collKey, { data: books, total_size: books.length });
    }
    for (const book of books) {
      if (isSessionBudgetExhausted()) {
        await saveProgress({ phase_progress: { ...phase_progress, bible_index: i } });
        return;
      }
      const bk = `v1/bibles/${bibleId}/books/${book.usfm}.json`;
      if (await r2Exists(bk)) continue;
      const d = await yvFetch<Book>(`/v1/bibles/${bibleId}/books/${book.usfm}`);
      if (d) await r2Put(bk, d);
    }
  }
  await advancePhase("chapters");
}

// PHASE 5 — Chapters
export async function phaseChapters(): Promise<void> {
  console.log("[Phase 5] Fetching Chapters...");
  const { selected_bible_ids, phase_progress } = getProgress();
  for (let bi = phase_progress.bible_index; bi < selected_bible_ids.length; bi++) {
    const bibleId = selected_bible_ids[bi];
    const books = (await r2Get<{ data: Book[] }>(`v1/bibles/${bibleId}/books.json`))?.data ?? [];
    const startBook = bi === phase_progress.bible_index ? phase_progress.book_index : 0;
    for (let bki = startBook; bki < books.length; bki++) {
      if (isSessionBudgetExhausted()) {
        await saveProgress({ phase_progress: { bible_index: bi, book_index: bki, chapter_index: 0, verse_index: 0 } });
        return;
      }
      const book = books[bki];
      const collKey = `v1/bibles/${bibleId}/books/${book.usfm}/chapters.json`;
      let chapters: Chapter[] = [];
      if (await r2Exists(collKey)) {
        chapters = (await r2Get<{ data: Chapter[] }>(collKey))?.data ?? [];
      } else {
        chapters = await yvFetchAll<Chapter>(`/v1/bibles/${bibleId}/chapters`, { book_usfm: book.usfm });
        await r2Put(collKey, { data: chapters, total_size: chapters.length });
      }
      for (const ch of chapters) {
        if (isSessionBudgetExhausted()) {
          await saveProgress({ phase_progress: { bible_index: bi, book_index: bki, chapter_index: 0, verse_index: 0 } });
          return;
        }
        const ck = `v1/bibles/${bibleId}/chapters/${ch.usfm}.json`;
        if (await r2Exists(ck)) continue;
        const d = await yvFetch<Chapter>(`/v1/bibles/${bibleId}/chapters/${ch.usfm}`);
        if (d) await r2Put(ck, d);
      }
    }
    if (isSessionBudgetExhausted()) return;
  }
  await advancePhase("verses_list");
}

// PHASE 6 — Verse list
export async function phaseVersesList(): Promise<void> {
  console.log("[Phase 6] Fetching Verse lists...");
  const { selected_bible_ids, phase_progress } = getProgress();
  for (let bi = phase_progress.bible_index; bi < selected_bible_ids.length; bi++) {
    const bibleId = selected_bible_ids[bi];
    const books = (await r2Get<{ data: Book[] }>(`v1/bibles/${bibleId}/books.json`))?.data ?? [];
    const startBook = bi === phase_progress.bible_index ? phase_progress.book_index : 0;
    for (let bki = startBook; bki < books.length; bki++) {
      const book = books[bki];
      const chapters = (await r2Get<{ data: Chapter[] }>(`v1/bibles/${bibleId}/books/${book.usfm}/chapters.json`))?.data ?? [];
      const startCh = (bi === phase_progress.bible_index && bki === phase_progress.book_index) ? phase_progress.chapter_index : 0;
      for (let chi = startCh; chi < chapters.length; chi++) {
        if (isSessionBudgetExhausted()) {
          await saveProgress({ phase_progress: { bible_index: bi, book_index: bki, chapter_index: chi, verse_index: 0 } });
          return;
        }
        const ch = chapters[chi];
        const key = `v1/bibles/${bibleId}/chapters/${ch.usfm}/verses.json`;
        if (await r2Exists(key)) continue;
        const verses = await yvFetchAll<Verse>(`/v1/bibles/${bibleId}/verses`, { chapter_usfm: ch.usfm });
        if (verses.length > 0) await r2Put(key, { data: verses, total_size: verses.length });
      }
    }
  }
  await advancePhase("verses_text");
}

// PHASE 7 — Verse text (long-running)
export async function phaseVersesText(): Promise<void> {
  console.log("[Phase 7] Fetching verse text...");
  const { selected_bible_ids, phase_progress } = getProgress();
  for (let bi = phase_progress.bible_index; bi < selected_bible_ids.length; bi++) {
    const bibleId = selected_bible_ids[bi];
    const books = (await r2Get<{ data: Book[] }>(`v1/bibles/${bibleId}/books.json`))?.data ?? [];
    const startBook = bi === phase_progress.bible_index ? phase_progress.book_index : 0;
    for (let bki = startBook; bki < books.length; bki++) {
      const book = books[bki];
      const chapters = (await r2Get<{ data: Chapter[] }>(`v1/bibles/${bibleId}/books/${book.usfm}/chapters.json`))?.data ?? [];
      const startCh = (bi === phase_progress.bible_index && bki === phase_progress.book_index) ? phase_progress.chapter_index : 0;
      for (let chi = startCh; chi < chapters.length; chi++) {
        const ch = chapters[chi];
        if (isSessionBudgetExhausted()) {
          await saveProgress({ phase_progress: { bible_index: bi, book_index: bki, chapter_index: chi, verse_index: 0 } });
          return;
        }
        const pk = `v1/bibles/${bibleId}/passages/${ch.usfm}.json`;
        if (!(await r2Exists(pk))) {
          const passage = await yvFetch<VerseData>(`/v1/bibles/${bibleId}/passages/${ch.usfm}`);
          if (passage) await r2Put(pk, passage);
        }
        const verses = (await r2Get<{ data: Verse[] }>(`v1/bibles/${bibleId}/chapters/${ch.usfm}/verses.json`))?.data ?? [];
        const startVi = (bi === phase_progress.bible_index && bki === phase_progress.book_index && chi === phase_progress.chapter_index) ? phase_progress.verse_index : 0;
        for (let vi = startVi; vi < verses.length; vi++) {
          if (isSessionBudgetExhausted()) {
            await saveProgress({ phase_progress: { bible_index: bi, book_index: bki, chapter_index: chi, verse_index: vi } });
            return;
          }
          const verse = verses[vi];
          const vk = `v1/bibles/${bibleId}/verses/${verse.usfm}.json`;
          if (await r2Exists(vk)) continue;
          const d = await yvFetch<VerseData>(`/v1/bibles/${bibleId}/verses/${verse.usfm}`);
          if (d) await r2Put(vk, d);
        }
      }
    }
  }
  for (const bibleId of selected_bible_ids) {
    if (isSessionBudgetExhausted()) return;
    const ik = `v1/bibles/${bibleId}/index.json`;
    if (await r2Exists(ik)) continue;
    const index = await yvFetch<BibleIndex>(`/v1/bibles/${bibleId}/index`);
    if (index) await r2Put(ik, index);
  }
  await advancePhase("done");
  console.log("All phases complete!");
}
