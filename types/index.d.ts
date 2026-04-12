export interface Collection<T> {
    data: T[];
    next_page_token?: string;
    total_size?: number;
}
export interface Language {
    id: number;
    iso_639_1: string;
    iso_639_3: string;
    name: string;
    local_name: string;
    text_direction: "ltr" | "rtl";
    available_bible_count: number;
}
export interface LanguageCollection extends Collection<Language> {
}
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
export interface BibleCollection extends Collection<Bible> {
}
export interface Book {
    usfm: string;
    human: string;
    human_long: string;
    canon: "ot" | "nt" | "dc";
    chapters: string[];
    abbreviation: string;
}
export interface BookCollection extends Collection<Book> {
}
export interface Chapter {
    usfm: string;
    human: string;
    book_usfm: string;
    verses: string[];
}
export interface ChapterCollection extends Collection<Chapter> {
}
export interface Verse {
    usfm: string;
    human: string;
    chapter_usfm: string;
    book_usfm: string;
}
export interface VerseCollection extends Collection<Verse> {
}
export interface VerseData {
    usfm: string[];
    human_reference: string;
    html: string | null;
    text: string;
    url: string;
}
export interface Passage {
    usfm: string[];
    human_reference: string;
    html: string | null;
    text: string;
    url: string;
    version_id: number;
}
export interface BibleIndex {
    [book_usfm: string]: {
        [chapter_usfm: string]: string[];
    };
}
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
export type ScrapePhase = "init" | "languages" | "bible_metadata" | "votd" | "books" | "chapters" | "verses_list" | "verses_text" | "done";
export interface PhaseProgress {
    bible_index: number;
    book_index: number;
    chapter_index: number;
    verse_index: number;
    page_token?: string;
}
export interface ScrapeProgress {
    schema_version: number;
    last_run: string;
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
//# sourceMappingURL=index.d.ts.map