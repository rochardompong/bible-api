// ============================================================
// YouVersion Platform API — Shared Type Definitions
// Mirrors the exact response shapes from api.youversion.com/v1
// ============================================================

// ------ Pagination ------------------------------------------

export interface Collection<T> {
  data: T[];
  next_page_token?: string;
  total_size?: number;
}

// ------ Languages -------------------------------------------

export interface Language {
  id: number;
  iso_639_1: string;
  iso_639_3: string;
  name: string;
  local_name: string;
  text_direction: "ltr" | "rtl";
  available_bible_count: number;
}

export interface LanguageCollection extends Collection<Language> {}

// ------ Bibles ----------------------------------------------

export interface Bible {
  id: number;
  abbreviation: string;
  localized_abbreviation: string;
  title: string;
  localized_title: string;
  language_tag: string;
  copyright: string;
  info: string;
  publisher_url: string;
  books: string[];
  youversion_deep_link: string;
  organization_id: string;
}

export interface BibleCollection extends Collection<Bible> {}

// ------ Books -----------------------------------------------

export interface Book {
  usfm: string;
  human: string;
  human_long: string;
  canon: "ot" | "nt" | "dc";
  chapters: string[];
  abbreviation: string;
}

export interface BookCollection extends Collection<Book> {}

// ------ Chapters --------------------------------------------

export interface Chapter {
  usfm: string;
  human: string;
  book_usfm: string;
  verses: string[];
}

export interface ChapterCollection extends Collection<Chapter> {}

// ------ Verses ----------------------------------------------

export interface Verse {
  usfm: string;
  human: string;
  chapter_usfm: string;
  book_usfm: string;
}

export interface VerseCollection extends Collection<Verse> {}

// ------ Verse Data (with text) ------------------------------

export interface VerseData {
  usfm: string[];
  human_reference: string;
  html: string | null;
  text: string;
  url: string;
}

// ------ Passage ---------------------------------------------

export interface Passage {
  usfm: string[];
  human_reference: string;
  html: string | null;
  text: string;
  url: string;
  version_id: number;
}

// ------ Bible Index -----------------------------------------

export interface BibleIndex {
  [book_usfm: string]: {
    [chapter_usfm: string]: string[]; // array of verse usfms
  };
}

// ------ Verse of the Day ------------------------------------

export interface VotdImage {
  attribution: string;
  url: string;
}

export interface VotdVerse {
  usfms: string[];
  human_reference: string;
  html: string | null;
  text: string;
  url: string;
}

export interface VotdDay {
  day: number;
  image: VotdImage;
  verse: VotdVerse;
}

export interface VotdYear {
  data: VotdDay[];
}

// ------ Progress State (stored in R2) -----------------------

export type ScrapePhase =
  | "init"               // Phase 0: fetch bible list, select 50
  | "languages"          // Phase 1: fetch all language metadata
  | "bible_metadata"     // Phase 2: fetch each selected bible's metadata
  | "votd"               // Phase 3: fetch VOTD calendar for all years
  | "books"              // Phase 4: fetch books for all bibles
  | "chapters"           // Phase 5: fetch chapters for all books
  | "verses_list"        // Phase 6: fetch verse list per chapter
  | "verses_text"        // Phase 7: fetch actual verse text (long-running)
  | "done";

export interface PhaseProgress {
  bible_index: number;       // which bible are we on (0-49)
  book_index: number;        // which book within that bible
  chapter_index: number;     // which chapter within that book
  verse_index: number;       // which verse within that chapter
  page_token?: string;       // for paginated endpoints
}

export interface ScrapeProgress {
  schema_version: number;
  last_run: string;          // ISO timestamp
  current_phase: ScrapePhase;
  phase_progress: PhaseProgress;
  selected_bible_ids: number[];
  completed_phases: ScrapePhase[];
  requests_this_session: number;
  total_requests_made: number;
}

export interface FailedRequest {
  url: string;
  r2_key: string;
  attempts: number;
  last_error: string;
  last_attempt: string;
}
