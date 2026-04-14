import * as dotenv from 'dotenv'
import axios from 'axios'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

dotenv.config()

const YOUVERSION_BASE = 'https://api.youversion.com'
const API_KEY = process.env.YOUVERSION_API_KEY
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'hybrid-bible-cache'
const PRIORITY_LANGUAGES = process.env.PRIORITY_LANGUAGES ? process.env.PRIORITY_LANGUAGES.split(',') : ['ENG', 'IND']
const TARGET = process.env.SCRAPE_TARGET || 'all'

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT, // e.g., https://<account_id>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

async function fetchFromYV(endpoint: string) {
  const url = `${YOUVERSION_BASE}${endpoint}`
  console.log(`[GET] ${url}`)
  try {
    const res = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
        'X-YouVersion-Client': 'youversion',
        'X-YouVersion-App-Platform': 'web',
        'X-YouVersion-App-Version': '1',
        'Authorization': `Bearer ${API_KEY}`
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

async function scrapeLanguages() {
  console.log('--- Scraping Languages ---')
  const data = await fetchFromYV('/languages')
  if (data) {
    await saveToR2('languages/index.json', data)
    return data.data || []
  }
  return []
}

async function scrapeBibles() {
  console.log('--- Scraping Bibles ---')
  const data = await fetchFromYV('/bibles')
  if (data) {
    await saveToR2('bibles/index.json', data)
    
    // Filter to priority languages (limit to max 3 per language PRD)
    const allBibles = data.data || []
    let targeted: any[] = []
    
    for (const lang of PRIORITY_LANGUAGES) {
      const biblesForLang = allBibles.filter((b: any) => b.language?.tag?.toUpperCase() === lang.toUpperCase())
      targeted = targeted.concat(biblesForLang.slice(0, 3)) // max 3 per lang
    }
    
    // Save individually
    for (const bible of targeted) {
      await saveToR2(`bibles/${bible.id}.json`, { data: bible })
    }
    
    return targeted
  }
  return []
}

async function runScrape() {
  console.log(`Starting Phase 1 Scrape. Target: ${TARGET}`)
  
  if (!API_KEY) {
    console.error("FATAL: YOUVERSION_API_KEY is missing")
    process.exit(1)
  }

  let languages = []
  let bibles: any[] = []

  if (TARGET === 'all' || TARGET === 'languages') {
    languages = await scrapeLanguages()
  }

  if (TARGET === 'all' || TARGET === 'bibles') {
    bibles = await scrapeBibles()
  }

  // PRD Strategy Note:
  // books, chapters, custom index, VOTD to be implemented iteratively per active bible.
  if (TARGET === 'all' || TARGET === 'books' || TARGET === 'chapters') {
    if (bibles.length === 0) {
      console.log('Fetching bibles required for books/chapters execution fallback...')
      bibles = await scrapeBibles()
    }
    
    for (const b of bibles) {
      const bibleId = b.id
      if (process.env.TARGET_BIBLE_ID && process.env.TARGET_BIBLE_ID !== String(bibleId)) {
        continue // Skip if not the targeted bible
      }
      
      console.log(`-- Fetching Books for Bible ${bibleId} --`)
      const booksData = await fetchFromYV(`/bibles/${bibleId}/books`)
      if (booksData) {
        await saveToR2(`bibles/${bibleId}/books.json`, booksData)
        
        // Custom Index building
        const customIndex: any = { bible_id: bibleId, books: [] }

        // Fetching chapters per book
        if (TARGET === 'all' || TARGET === 'chapters') {
          for (const book of (booksData.data || [])) {
            const bookId = book.id
            const chaptersData = await fetchFromYV(`/bibles/${bibleId}/books/${bookId}/chapters`)
            if (chaptersData) {
              await saveToR2(`bibles/${bibleId}/books/${bookId}/chapters.json`, chaptersData)
              
              customIndex.books.push({
                book_id: bookId,
                name: book.name,
                chapters: (chaptersData.data || []).map((ch: any) => ch.id)
              })
            }
          }
        }
        
        // Save the custom generated index
        if (customIndex.books.length > 0) {
          await saveToR2(`bibles/${bibleId}/index.json`, { data: customIndex })
        }
      }
    }
  }

  if (TARGET === 'all' || TARGET === 'votd') {
    console.log('--- Scraping VOTD ---')
    const today = new Date()
    const year = today.getFullYear()
    const day = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24)
    
    // Scrape today + 3 days buffer
    for(let offset = 0; offset <= 3; offset++) {
      const targetDay = day + offset
      const votdData = await fetchFromYV(`/verse_of_the_day/${targetDay}?year=${year}`)
      if (votdData) {
        await saveToR2(`verse_of_the_day/${year}/${targetDay}.json`, votdData)
      }
      // Also save yearly if it's offset 0 
      if (offset === 0 && votdData) {
         await saveToR2(`verse_of_the_day/${year}.json`, votdData)
      }
    }
  }

  console.log("Scrape Complete.")
}

runScrape().catch(console.error)
