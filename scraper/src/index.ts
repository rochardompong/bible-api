import * as dotenv from 'dotenv'
import axios from 'axios'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'

dotenv.config()

const YOUVERSION_BASE = 'https://api.youversion.com/v1'
const API_KEY = process.env.YOUVERSION_API_KEY
const R2_BUCKET = process.env.R2_BUCKET_NAME
const PRIORITY_LANGUAGES = process.env.PRIORITY_LANGUAGES ? process.env.PRIORITY_LANGUAGES.split(',') : ['ENG', 'IND']
const MAX_DYNAMIC = process.env.MAX_DYNAMIC_LANGUAGES ? parseInt(process.env.MAX_DYNAMIC_LANGUAGES) : 5

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

interface ScraperState {
  last_run: string;
  current_level: number;
  completed_levels: number[];
  progress: any;
  status: 'in_progress' | 'completed' | 'failed';
}

async function fetchFromYV(endpoint: string) {
  const url = `${YOUVERSION_BASE}${endpoint}`
  console.log(`[GET] ${url}`)
  try {
    const res = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
        'X-YVP-App-Key': API_KEY
      }
    })
    return res.data
  } catch (error: any) {
    if (error.response?.status === 429) {
      console.warn(`[RATE LIMIT] ${url} - sleeping 60s`)
      await new Promise(resolve => setTimeout(resolve, 60000))
      return fetchFromYV(endpoint)
    }
    console.error(`Error fetching ${endpoint}:`, error.message)
    return null
  }
}

async function saveToR2(key: string, data: any) {
  try {
    const body = typeof data === 'string' ? data : JSON.stringify(data)
    await s3Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: 'application/json'
    }))
    console.log(`[R2 SAVE] s3://${R2_BUCKET}/${key}`)
  } catch (err: any) {
    console.error(`[R2 ERROR] failed to save ${key}:`, err.message)
  }
}

async function getFromR2(key: string) {
  try {
    const data = await s3Client.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }))
    const str = await data.Body?.transformToString()
    return str ? JSON.parse(str) : null
  } catch (err: any) {
    if (err.name !== 'NoSuchKey') {
      console.error(`[R2 ERROR] failed to get ${key}:`, err.message)
    }
    return null
  }
}

async function getState(): Promise<ScraperState> {
  const state = await getFromR2('scraper/state.json')
  if (state && state.status === 'in_progress') {
    return state
  }
  return {
    last_run: new Date().toISOString(),
    current_level: 1,
    completed_levels: [],
    progress: {},
    status: 'in_progress'
  }
}

async function saveState(state: ScraperState) {
  state.last_run = new Date().toISOString()
  await saveToR2('scraper/state.json', state)
}

async function scrapeLanguages() {
  console.log('--- Level 1: Scraping Languages ---')
  let allLangs: any[] = []
  let pageToken: string | null = null
  
  for (let i = 0; i < 200; i++) {
    const endpoint = `/languages${pageToken ? '?page_token=' + pageToken : ''}`
    const data = await fetchFromYV(endpoint)
    
    if (data && data.data) {
      allLangs = allLangs.concat(data.data)
      pageToken = data.next_page_token
      await new Promise(resolve => setTimeout(resolve, 500))
      if (!pageToken) break
    } else {
      break
    }
  }
  
  if (allLangs.length > 0) {
    await saveToR2('languages/index.json', { data: allLangs, total_size: allLangs.length })
  }
}

async function scrapeBibles(state: ScraperState) {
  console.log('--- Level 2: Scraping Bibles ---')
  const langData = await getFromR2('languages/index.json')
  const languagesData = langData ? langData.data : []
  
  const forcedLangs = PRIORITY_LANGUAGES.map(l => l.trim().toUpperCase())
  let dynamicLangs: string[] = []
  
  if (languagesData && languagesData.length > 0) {
    const sortedLangs = [...languagesData].sort((a: any, b: any) => {
      const popA = a.speaking_population || a.writing_population || 0
      const popB = b.speaking_population || b.writing_population || 0
      return popB - popA
    })

    dynamicLangs = sortedLangs
      .map((l: any) => (l.tag || l.id || l.language || '').toUpperCase())
      .filter(tag => tag && !forcedLangs.includes(tag))
      .slice(0, MAX_DYNAMIC)
  }

  const targetLanguages = [...forcedLangs, ...dynamicLangs]
  console.log(`Target Languages: ${targetLanguages.join(', ')}`)

  let targeted: any[] = []
  
  const startIdx = state.progress.lang_index || 0

  for (let i = startIdx; i < targetLanguages.length; i++) {
    const lang = targetLanguages[i]
    const data = await fetchFromYV(`/bibles?language_ranges[]=${lang}`)
    
    if (data && data.data) {
      // Filter wajib: Old + New Testament lengkap (mengandung kitab 'GEN' dan 'MAT')
      const completeBibles = data.data.filter((b: any) => {
        if (!b.books || !Array.isArray(b.books)) return false
        return b.books.includes('GEN') && b.books.includes('MAT')
      })
      
      const top3 = completeBibles.slice(0, 3)
      targeted = targeted.concat(top3)
    }
    
    state.progress.lang_index = i + 1
    await saveState(state)
  }

  if (targeted.length > 0) {
    await saveToR2('bibles/index.json', { data: targeted })
    for (const bible of targeted) {
      await saveToR2(`bibles/${bible.id}.json`, { data: bible })
    }
  }
}

async function scrapeBooks(state: ScraperState) {
  console.log('--- Level 3: Scraping Books ---')
  const biblesData = await getFromR2('bibles/index.json')
  const bibles = biblesData ? biblesData.data : []
  
  if (bibles.length === 0) return

  const startIdx = state.progress.bible_index || 0

  for (let i = startIdx; i < bibles.length; i++) {
    const bibleId = bibles[i].id
    console.log(`-- Fetching Books for Bible ${bibleId} --`)
    const booksData = await fetchFromYV(`/bibles/${bibleId}/books`)
    if (booksData) {
      await saveToR2(`bibles/${bibleId}/books.json`, booksData)
    }
    state.progress.bible_index = i + 1
    await saveState(state)
  }
  // reset progress for next level
  state.progress = {}
}

async function scrapeChapters(state: ScraperState) {
  console.log('--- Level 4: Scraping Chapters ---')
  const biblesData = await getFromR2('bibles/index.json')
  const bibles = biblesData ? biblesData.data : []
  
  if (bibles.length === 0) return

  let bibleIdx = state.progress.bible_index || 0
  let bookIdx = state.progress.book_index || 0

  for (; bibleIdx < bibles.length; bibleIdx++) {
    const bibleId = bibles[bibleIdx].id
    const booksData = await getFromR2(`bibles/${bibleId}/books.json`)
    const books = booksData ? booksData.data : []
    
    if (books && books.length > 0) {
      for (; bookIdx < books.length; bookIdx++) {
        const bookId = books[bookIdx].id
        const chaptersData = await fetchFromYV(`/bibles/${bibleId}/books/${bookId}/chapters`)
        if (chaptersData) {
          await saveToR2(`bibles/${bibleId}/books/${bookId}/chapters.json`, chaptersData)
        }
        
        state.progress.bible_index = bibleIdx
        state.progress.book_index = bookIdx + 1
        await saveState(state)
      }
    }
    // reset book index for next bible
    bookIdx = 0
  }
  state.progress = {}
}

async function generateIndex(state: ScraperState) {
  console.log('--- Level 5: Generating /index ---')
  const biblesData = await getFromR2('bibles/index.json')
  const bibles = biblesData ? biblesData.data : []
  
  if (bibles.length === 0) return

  const startIdx = state.progress.bible_index || 0

  for (let i = startIdx; i < bibles.length; i++) {
    const bibleId = bibles[i].id
    const booksData = await getFromR2(`bibles/${bibleId}/books.json`)
    const books = booksData ? booksData.data : []
    
    const customIndex: any = { bible_id: bibleId, books: [] }
    
    if (books && books.length > 0) {
      for (const book of books) {
        const chaptersData = await getFromR2(`bibles/${bibleId}/books/${book.id}/chapters.json`)
        if (chaptersData && chaptersData.data) {
          customIndex.books.push({
            book_id: book.id,
            name: book.name,
            chapters: chaptersData.data.map((ch: any) => ch.id)
          })
        }
      }
    }
    
    if (customIndex.books.length > 0) {
      await saveToR2(`bibles/${bibleId}/index.json`, { data: customIndex })
    }
    
    state.progress.bible_index = i + 1
    await saveState(state)
  }
  state.progress = {}
}

async function scrapeVOTD() {
  console.log('--- Level 6: Scraping VOTD ---')
  const today = new Date()
  const year = today.getFullYear()
  const day = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24)

  for (let offset = 0; offset <= 3; offset++) {
    const targetDay = day + offset
    const votdData = await fetchFromYV(`/verse_of_the_days/${targetDay}?year=${year}`)
    if (votdData) {
      await saveToR2(`verse_of_the_day/${year}/${targetDay}.json`, votdData)
    }
    if (offset === 0 && votdData) {
      await saveToR2(`verse_of_the_day/${year}.json`, votdData)
    }
  }
}

async function runStateMachine() {
  if (!API_KEY) {
    console.error("FATAL: YOUVERSION_API_KEY is missing")
    process.exit(1)
  }

  const state = await getState()
  console.log(`Resuming from Level ${state.current_level}`)

  try {
    if (state.current_level === 1) {
      await scrapeLanguages()
      state.completed_levels.push(1)
      state.current_level = 2
      state.progress = {}
      await saveState(state)
    }

    if (state.current_level === 2) {
      await scrapeBibles(state)
      state.completed_levels.push(2)
      state.current_level = 3
      state.progress = {}
      await saveState(state)
    }

    if (state.current_level === 3) {
      await scrapeBooks(state)
      state.completed_levels.push(3)
      state.current_level = 4
      state.progress = {}
      await saveState(state)
    }

    if (state.current_level === 4) {
      await scrapeChapters(state)
      state.completed_levels.push(4)
      state.current_level = 5
      state.progress = {}
      await saveState(state)
    }

    if (state.current_level === 5) {
      await generateIndex(state)
      state.completed_levels.push(5)
      state.current_level = 6
      state.progress = {}
      await saveState(state)
    }

    if (state.current_level === 6) {
      await scrapeVOTD()
      state.completed_levels.push(6)
      state.status = 'completed'
      state.progress = {}
      await saveState(state)
    }

    console.log("State Machine Complete.")

  } catch (error) {
    console.error("Scraper failed during execution:", error)
    state.status = 'failed'
    await saveState(state)
    process.exit(1)
  }
}

runStateMachine().catch(console.error)
