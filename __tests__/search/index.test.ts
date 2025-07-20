import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'bun'
import { GameListObjectSchema, GameListSchema } from '../../src/models/game.dto'
import { doesNotThrow } from 'node:assert'
import { decodeGameList } from '../../src/utils/jsa'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)
dayjs.tz.setDefault('Asia/Tokyo')

const readFile = (file: string | number): Buffer => {
  return readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'bin', `${file}.bin`))
}

const fetchFile = async (params: { p1: number, p2: number, p3: number}): Promise<Buffer> => {
  const url: URL = new URL('api/index.php', 'https://ip.jsamobile.jp')
  url.searchParams.set('action', 'search')
  url.searchParams.set('p1', params.p1.toString())
  url.searchParams.set('p2', params.p2.toString())
  url.searchParams.set('p3', params.p3.toString())
  console.log(url.href, process.env.TOKEN)
  const response = await fetch(url.href, {
    method: 'GET',
    headers: {
        Authorization: `Basic ${process.env.TOKEN}`,
        'User-Agent': 'JsaLive/1 CFNetwork/1474.1 Darwin/23.0.0'
    }
  })
  return Buffer.from(await response.arrayBuffer())
}

describe('[Success] Parse', () => {
    test('Parse 100', () => {
      const buffer: Buffer = readFile('20250720_1')
      const result = GameListObjectSchema.safeParse(buffer)
      if (!result.success) {
        console.error(result.error)
        throw new Error(`Failed to parse GameList for 100`)
      }
      expect(result.data.games.length).toEqual(1)
      expect(result.data.games.length).toEqual(result.data.count)
      doesNotThrow(() => decodeGameList(buffer))
    })
    test('Parse 200', () => {
      const buffer: Buffer = readFile('20250720_2')
      const result = GameListObjectSchema.safeParse(buffer)
      if (!result.success) {
        console.error(result.error)
        throw new Error(`Failed to parse GameList for 200`)
      }
      expect(result.data.games.length).toEqual(42)
      expect(result.data.games.length).toEqual(result.data.count)
      doesNotThrow(() => decodeGameList(buffer))
    })
    test('Parse 14000', () => {
      const buffer: Buffer = readFile('20250720_3')
      const result = GameListObjectSchema.safeParse(buffer)
      if (!result.success) {
        console.error(result.error)
        throw new Error(`Failed to parse GameList for 14000`)
      }
      expect(result.data.games.length).toEqual(890)
      expect(result.data.games.length).toEqual(result.data.count)
      doesNotThrow(() => console.log(decodeGameList(buffer)))
    })
    test('Parse 200', async () => {
      const buffer: Buffer = await fetchFile({ p1: 0, p2: 200, p3: 2 })
      console.log(buffer.length)
      const result = GameListObjectSchema.safeParse(buffer)
      if (!result.success) {
        console.error(result.error)
        throw new Error(`Failed to parse GameList for 14000`)
      }
      expect(result.data.games.length).toEqual(result.data.count)
      doesNotThrow(() => console.log(decodeGameList(buffer)))
    })
    test('Parse 14000', async () => {
      const buffer: Buffer = await fetchFile({ p1: 0, p2: 14000, p3: 3 })
      console.log(buffer.length)
      const result = GameListObjectSchema.safeParse(buffer)
      if (!result.success) {
        console.error(result.error)
        throw new Error(`Failed to parse GameList for 14000`)
      }
      expect(result.data.games.length).toEqual(result.data.count)
      doesNotThrow(() => console.log(decodeGameList(buffer)))
      console.log(result.data.games.map((game) => game.black.last_name))
      console.log(result.data.games.map((game) => game.black.first_name))
    })
})
