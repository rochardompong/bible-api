import * as dotenv from 'dotenv'
import axios from 'axios'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'

dotenv.config()

const YOUVERSION_BASE = 'https://api.youversion.com/v1'
const API_KEY = process.env.YOUVERSION_API_KEY
const R2_BUCKET = process.env.R2_BUCKET_NAME
const PRIORITY_LANGUAGES = process.env.PRIORITY_LANGUAGES ? process.env.PRIORITY_LANGUAGES.split(',') : ['ENG', 'IND']
const MAX_DYNAMIC = process.env.MAX_DYNAMIC_LANGUAGES ? parseInt(process.env.MAX_DYNAMIC_LANGUAGES) : 10

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

// Helper untuk fetch dengan pagination penuh
async function fetchAllPages(baseEndpoint: string) {
  let allData: any[] = []
  let pageToken: string | null = null
  let safetyCounter = 0
  const maxPages = 500 // Mencegah infinite loop

  do {
    const connector = baseEndpoint.includes('?') ? '&' : '?'
    const endpoint = pageToken ? `${baseEndpoint}${connector}page_token=${pageToken}` : baseEndpoint
    const data = await fetchFromYV(endpoint)
    
    if (data && data.data) {
      allData = allData.concat(data.data)
      pageToken = data.next_page_token
    } else {
      pageToken = null
    }
    
    safetyCounter++
    await new Promise(resolve => setTimeout(resolve, 500)) // Rate limit protection
  } while (pageToken && safetyCounter < maxPages)

  return allData
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

// Mapping manual untuk negara utama jika API tidak menyediakan
const COUNTRY_MAP: Record<string, any> = {
  'eng': { code: 'US', name: 'United States', flag: '🇺🇸', aliases: ['GB', 'AU', 'CA'] },
  'id': { code: 'ID', name: 'Indonesia', flag: '🇮🇩', aliases: [] },
  'spa': { code: 'ES', name: 'Spain', flag: '🇪🇸', aliases: ['MX', 'AR'] },
  'fra': { code: 'FR', name: 'France', flag: '🇫🇷', aliases: ['CA'] },
  'por': { code: 'PT', name: 'Portugal', flag: '🇵🇹', aliases: ['BR'] },
  'zho': { code: 'CN', name: 'China', flag: '🇨🇳', aliases: ['TW', 'HK'] },
  'arb': { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', aliases: ['AE', 'EG'] },
  'hin': { code: 'IN', name: 'India', flag: '🇮🇳', aliases: [] },
  'rus': { code: 'RU', name: 'Russia', flag: '🇷🇺', aliases: [] },
  'jpn': { code: 'JP', name: 'Japan', flag: '🇯🇵', aliases: [] },
  'deu': { code: 'DE', name: 'Germany', flag: '🇩🇪', aliases: [] },
  'kor': { code: 'KR', name: 'South Korea', flag: '🇰🇷', aliases: [] },
}

async function discoverBiblesAndLanguages() {
  console.log('--- Level 1: Discovering Bibles, Languages & Countries ---')
  
  // 1. Ambil daftar bahasa mentah dari /languages (Karena /bibles global ditolak 422 oleh YouVersion)
  console.log('Fetching raw languages list...')
  const allLangsRaw = await fetchAllPages('/languages')
  console.log(`Found ${allLangsRaw.length} raw languages.`)

  const forcedLangs = PRIORITY_LANGUAGES.map(l => l.trim().toLowerCase())
  
  // Sortir bahasa berdasarkan populasi untuk mendapatkan yang paling umum
  const sortedLangs = [...allLangsRaw].sort((a: any, b: any) => {
    const popA = a.speaking_population || a.writing_population || 0
    const popB = b.speaking_population || b.writing_population || 0
    return popB - popA
  })

  // Ambil tag bahasa dinamis yang populer
  const dynamicLangs = sortedLangs
    .map((l: any) => (l.tag || l.id || l.language || '').toLowerCase())
    .filter(tag => tag && !forcedLangs.includes(tag))
    .slice(0, MAX_DYNAMIC)

  const targetLanguages = [...new Set([...forcedLangs, ...dynamicLangs])]
  console.log(`Selected target languages: ${targetLanguages.join(', ')}`)

  const biblesByLang: Record<string, any[]> = {}
  const langMetadata: Record<string, any> = {}

  // Simpan metadata asli dari /languages untuk referensi negara
  for (const lang of allLangsRaw) {
      const tag = (lang.tag || lang.id || lang.language || '').toLowerCase()
      if (targetLanguages.includes(tag)) {
          langMetadata[tag] = lang
      }
  }

  // 2. Fetch Bibles HANYA untuk bahasa yang terpilih
  let totalCompleteBibles = 0;
  for (const tag of targetLanguages) {
      console.log(`Fetching bibles for language: ${tag}`)
      const biblesForLang = await fetchAllPages(`/bibles?language_ranges[]=${tag}`)
      
      // Filter: Wajib punya GEN (Kejadian) dan MAT (Matius)
      const validBibles = biblesForLang.filter((b: any) => {
        if (!b.books || !Array.isArray(b.books)) return false
        return b.books.includes('GEN') && b.books.includes('MAT')
      })
      
      if (validBibles.length > 0) {
          biblesByLang[tag] = validBibles
          totalCompleteBibles += validBibles.length
      } else {
          console.log(`No complete bibles found for ${tag}.`)
      }
  }

  console.log(`${totalCompleteBibles} bibles have complete OT+NT.`)

  const finalBibles: any[] = []
  const finalLanguages: any[] = []
  const countriesMap: Record<string, any> = {}

  for (const tag of targetLanguages) {
    if (!biblesByLang[tag]) continue

    // Ambil Top 3 Alkitab untuk bahasa ini
    const top3 = biblesByLang[tag].slice(0, 3)
    finalBibles.push(...top3)

    // Susun metadata bahasa yang bersih
    const rawLang = langMetadata[tag] || {}
    const langEntry = {
      id: rawLang.id || tag,
      tag: tag,
      name: rawLang.name || tag,
      local_name: rawLang.local_name || rawLang.name || tag,
      countries: rawLang.countries || [],
      bible_count: top3.length
    }
    
    // Coba ambil local_name dari display_names jika ada
    if (rawLang.display_names) {
        langEntry.name = rawLang.display_names['en'] || langEntry.name;
        langEntry.local_name = rawLang.display_names[tag] || langEntry.local_name;
    }

    finalLanguages.push(langEntry)

    // Susun pemetaan Negara
    let primaryCountryCode = (langEntry.countries && langEntry.countries.length > 0) 
      ? langEntry.countries[0] 
      : null

    let countryData = COUNTRY_MAP[tag] || COUNTRY_MAP[tag.substring(0,2)]
    
    if (!countryData && primaryCountryCode) {
      // Fallback jika tidak ada di map manual
      countryData = { code: primaryCountryCode, name: primaryCountryCode, flag: '🌐', aliases: [] }
    } else if (!countryData) {
       countryData = { code: tag.toUpperCase(), name: langEntry.name, flag: '🌐', aliases: [] }
    }

    const cCode = countryData.code
    if (!countriesMap[cCode]) {
      countriesMap[cCode] = {
        country_code: cCode,
        name: countryData.name,
        flag_emoji: countryData.flag,
        languages: []
      }
    }
    
    countriesMap[cCode].languages.push({
      tag: tag,
      name: langEntry.local_name,
      is_primary: countriesMap[cCode].languages.length === 0
    })
  }

  // 4. Simpan hasil yang sudah sangat ramping dan terkurasi ke R2
  const finalCountries = Object.values(countriesMap)
  
  console.log(`Saving ${finalLanguages.length} Languages (Clean)`)
  await saveToR2('languages/index.json', { data: finalLanguages, total_active_languages: finalLanguages.length })
  
  console.log(`Saving ${finalCountries.length} Countries (For UI)`)
  await saveToR2('countries/index.json', { data: finalCountries })

  console.log(`Saving ${finalBibles.length} Bibles`)
  await saveToR2('bibles/index.json', { data: finalBibles })
  for (const bible of finalBibles) {
    await saveToR2(`bibles/${bible.id}.json`, { data: bible })
  }
}

async function scrapeBooks(state: ScraperState) {
  console.log('--- Level 2: Scraping Books (With Pagination) ---')
  const biblesData = await getFromR2('bibles/index.json')
  const bibles = biblesData ? biblesData.data : []
  
  if (bibles.length === 0) return

  const startIdx = state.progress.bible_index || 0

  for (let i = startIdx; i < bibles.length; i++) {
    const bibleId = bibles[i].id
    console.log(`-- Fetching Books for Bible ${bibleId} --`)
    // Gunakan fetchAllPages untuk Kitab (mengantisipasi kitab Apokrifa yang banyak)
    const booksData = await fetchAllPages(`/bibles/${bibleId}/books`)
    if (booksData && booksData.length > 0) {
      await saveToR2(`bibles/${bibleId}/books.json`, { data: booksData })
    }
    state.progress.bible_index = i + 1
    await saveState(state)
  }
  state.progress = {}
}

async function scrapeChapters(state: ScraperState) {
  console.log('--- Level 3: Scraping Chapters (With Pagination) ---')
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
        // Gunakan fetchAllPages untuk Pasal (mengantisipasi kitab Mazmur yang 150 pasal)
        const chaptersData = await fetchAllPages(`/bibles/${bibleId}/books/${bookId}/chapters`)
        if (chaptersData && chaptersData.length > 0) {
          await saveToR2(`bibles/${bibleId}/books/${bookId}/chapters.json`, { data: chaptersData })
        }
        
        state.progress.bible_index = bibleIdx
        state.progress.book_index = bookIdx + 1
        await saveState(state)
      }
    }
    bookIdx = 0
  }
  state.progress = {}
}

async function generateIndex(state: ScraperState) {
  console.log('--- Level 4: Generating /index (Native YouVersion) ---')
  const biblesData = await getFromR2('bibles/index.json')
  const bibles = biblesData ? biblesData.data : []
  
  if (bibles.length === 0) return

  const startIdx = state.progress.bible_index || 0

  for (let i = startIdx; i < bibles.length; i++) {
    const bibleId = bibles[i].id
    console.log(`-- Fetching Native Index for Bible ${bibleId} --`)
    
    const indexData = await fetchFromYV(`/bibles/${bibleId}/index`)
    if (indexData) {
       await saveToR2(`bibles/${bibleId}/index.json`, indexData) // Langsung simpan JSON utuh
    }
    
    state.progress.bible_index = i + 1
    await saveState(state)
  }
  state.progress = {}
}

async function scrapeVOTD() {
  console.log('--- Level 5: Scraping VOTD ---')
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
      await discoverBiblesAndLanguages()
      state.completed_levels.push(1)
      state.current_level = 2
      state.progress = {}
      await saveState(state)
    }

    if (state.current_level === 2) {
      await scrapeBooks(state)
      state.completed_levels.push(2)
      state.current_level = 3
      state.progress = {}
      await saveState(state)
    }

    if (state.current_level === 3) {
      await scrapeChapters(state)
      state.completed_levels.push(3)
      state.current_level = 4
      state.progress = {}
      await saveState(state)
    }

    if (state.current_level === 4) {
      await generateIndex(state)
      state.completed_levels.push(4)
      state.current_level = 5
      state.progress = {}
      await saveState(state)
    }

    if (state.current_level === 5) {
      await scrapeVOTD()
      state.completed_levels.push(5)
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
