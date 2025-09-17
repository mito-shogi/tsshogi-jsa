import { describe, expect, it, test } from 'bun:test'
import { doesNotThrow } from 'node:assert'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'bun'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { GameListObjectSchema } from '../../src/models/game.dto'
import { decodeGameList, decodeJSA, importJSA } from '../../src/utils/jsa'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)
dayjs.tz.setDefault('Asia/Tokyo')

const readFile = (file: string | number): Buffer => {
  return readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'bin', `${file}.bin`))
}

const fetchFile = async (
  action: 'search' | 'shogi',
  params: { p1: number; p2: number; p3: number }
): Promise<Buffer> => {
  const url: URL = new URL('api/index.php', 'https://ip.jsamobile.jp')
  url.searchParams.set('action', action)
  url.searchParams.set('p1', params.p1.toString())
  url.searchParams.set('p2', params.p2.toString())
  url.searchParams.set('p3', params.p3.toString())
  const response = await fetch(url.href, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${process.env.TOKEN}`,
      'User-Agent': 'JsaLive/1 CFNetwork/1474.1 Darwin/23.0.0'
    }
  })
  const buffer = Buffer.from(await response.arrayBuffer())
  // writeFileSync(join(dirname(fileURLToPath(import.meta.url)), 'bin', `${params.p1}.bin`), buffer)
  return buffer
}

describe('[Success] Parse', () => {
  test('20250720', () => {
    const paths: string[] = ['20250720_1', '20250720_2', '20250720_3']
    for (const path of paths) {
      const buffer: Buffer = readFile(path)
      const result = GameListObjectSchema.safeParse(buffer)
      if (!result.success) {
        console.error(result.error)
        throw new Error('Failed to parse GameList')
      }
      expect(result.data.games.length).toEqual(result.data.count)
      doesNotThrow(() => decodeGameList(buffer))
    }
  })
  test('20250722', () => {
    const paths: string[] = ['20250722_2', '20250722_3']
    for (const path of paths) {
      const buffer: Buffer = readFile(path)
      const result = GameListObjectSchema.safeParse(buffer)
      if (!result.success) {
        console.error(result.error)
        throw new Error('Failed to parse GameList')
      }
      expect(result.data.games.length).toEqual(result.data.count)
      doesNotThrow(() => decodeGameList(buffer))
    }
  })
  test('20250723', () => {
    const paths: string[] = ['20250723_3']
    for (const path of paths) {
      const buffer: Buffer = readFile(path)
      const result = GameListObjectSchema.safeParse(buffer)
      if (!result.success) {
        console.error(result.error)
        throw new Error('Failed to parse GameList')
      }
      expect(result.data.games.length).toEqual(result.data.count)
      doesNotThrow(() => decodeGameList(buffer))
    }
  })
  it('Fetch 100', async () => {
    const buffer: Buffer = await fetchFile('search', { p1: 0, p2: 100, p3: 1 })
    const result = GameListObjectSchema.safeParse(buffer)
    if (!result.success) {
      console.error(result.error)
      throw new Error('Failed to parse GameList for 100')
    }
    expect(result.data.games.length).toEqual(result.data.count)
    doesNotThrow(() => decodeGameList(buffer))
    for (const game of result.data.games) {
      console.debug('Game Id:', game.game_id)
      const buffer: Buffer = await fetchFile('shogi', { p1: game.game_id, p2: 0, p3: 0 })
      doesNotThrow(() => decodeJSA(buffer))
      doesNotThrow(() => importJSA(buffer))
    }
  })
  it('Fetch 200', async () => {
    const buffer: Buffer = await fetchFile('search', { p1: 0, p2: 200, p3: 2 })
    const result = GameListObjectSchema.safeParse(buffer)
    if (!result.success) {
      console.error(result.error)
      throw new Error('Failed to parse GameList for 200')
    }
    expect(result.data.games.length).toEqual(result.data.count)
    doesNotThrow(() => decodeGameList(buffer))
    for (const game of result.data.games) {
      console.debug('Game Id:', game.game_id)
      const buffer: Buffer = await fetchFile('shogi', { p1: game.game_id, p2: 0, p3: 0 })
      doesNotThrow(() => decodeJSA(buffer))
      doesNotThrow(() => importJSA(buffer))
    }
  })
  it('Fetch 14000', async () => {
    const buffer: Buffer = await fetchFile('search', { p1: 0, p2: 14000, p3: 3 })
    const result = GameListObjectSchema.safeParse(buffer)
    if (!result.success) {
      console.error(result.error)
      throw new Error('Failed to parse GameList for 14000')
    }
    expect(result.data.games.length).toEqual(result.data.count)
    doesNotThrow(() => decodeGameList(buffer))
  })
})
