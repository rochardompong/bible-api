export const keyBibles = () => "v1/bibles.json";
export const keyBible = (id: string) => `v1/bibles/${id}.json`;
export const keyBooks = (id: string) => `v1/bibles/${id}/books.json`;
export const keyBook = (id: string, book: string) => `v1/bibles/${id}/books/${book}.json`;
export const keyChapters = (id: string, book: string) => `v1/bibles/${id}/books/${book}/chapters.json`;
export const keyChapter = (id: string, ch: string) => `v1/bibles/${id}/chapters/${ch}.json`;
export const keyVerseList = (id: string, ch: string) => `v1/bibles/${id}/chapters/${ch}/verses.json`;
export const keyVerse = (id: string, verse: string) => `v1/bibles/${id}/verses/${verse}.json`;
export const keyPassage = (id: string, ref: string) => `v1/bibles/${id}/passages/${ref}.json`;
export const keyIndex = (id: string) => `v1/bibles/${id}/index.json`;
export const keyLanguages = () => "v1/languages.json";
export const keyLanguage = (id: string) => `v1/languages/${id}.json`;
export const keyVotdYear = (year: number) => `v1/verse-of-the-days/${year}.json`;
export const keyVotdDay = (year: number, day: number) => `v1/verse-of-the-days/${year}/${day}.json`;

export function getDayOfYear(): { year: number; day: number } {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const day = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return { year: now.getFullYear(), day };
}
