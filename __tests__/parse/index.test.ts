import { beforeAll, describe, expect, it } from 'bun:test'
import { doesNotThrow } from 'node:assert'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { type Record, RecordMetadataKey } from 'tsshogi'
import { decodeBJFList, importBJF } from '../../src/models/game/ai.dto'
import { decodeIKFList, importIKF } from '../../src/models/game/ikf.ts'
import { decodeBSAList, importBSA } from '../../src/models/game/jsam.dto'
import { decodeBIFList, importBIF } from '../../src/models/game/meijin.dto'
import {
  fetch_ai_game,
  fetch_ai_game_list,
  fetch_igoshogi_game,
  fetch_igoshogi_game_list,
  fetch_jsam_game,
  fetch_jsam_game_list,
  fetch_meijin_game,
  fetch_meijin_game_list
} from '../utils/client'

describe('Parse Game List', () => {
  beforeAll(() => {
    dayjs.extend(utc)
    dayjs.extend(timezone)
    dayjs.extend(customParseFormat)
    dayjs.tz.setDefault('Asia/Tokyo')
  })

  it('JSAM 100', async () => {
    const buffer = await fetch_jsam_game_list({ p1: 0, p2: 100, p3: 1 })
    const { games, count } = decodeBSAList(buffer)
    expect(games.length).toBe(count)
    expect(games.length).toBeGreaterThanOrEqual(1)
    for (const game of games.sort((a, b) => b.game_id - a.game_id)) {
      expect(game.meijin_id).toBeUndefined()
      expect(game.key).toBeUndefined()
      expect(game.metadata.start_time).toBeDefined()
      expect(game.metadata.end_time).not.toBeUndefined()
      expect(game.metadata.title).toBeDefined()
      expect(game.metadata.tournament).toBeDefined()
      expect(game.metadata.place).not.toBeNull()
      expect(game.metadata.strategy).not.toBeNull()
      console.log(game.game_id, game.metadata.title)
    }
  })

  it('JSAM 200', async () => {
    const buffer = await fetch_jsam_game_list({ p1: 0, p2: 200, p3: 2 })
    const { games, count } = decodeBSAList(buffer)
    expect(games.length).toBe(count)
    expect(games.length).toBeGreaterThan(1)
    for (const game of games.sort((a, b) => b.game_id - a.game_id)) {
      expect(game.meijin_id).toBeUndefined()
      expect(game.key).toBeUndefined()
      expect(game.metadata.start_time).toBeDefined()
      expect(game.metadata.end_time).not.toBeUndefined()
      expect(game.metadata.title).toBeDefined()
      expect(game.metadata.tournament).toBeDefined()
      expect(game.metadata.place).not.toBeNull()
      expect(game.metadata.strategy).not.toBeNull()
    }
  })

  // it('JSAM 14000', async () => {
  //   const buffer = await fetch_jsam_game_list({ p1: 0, p2: 14000, p3: 3 })
  //   const { games, count } = decodeBSAList(buffer)
  //   expect(games.length).toBe(count)
  //   expect(games.length).toBeGreaterThan(1)
  //   for (const game of games.sort((a, b) => b.game_id - a.game_id)) {
  //     expect(game.meijin_id).toBeUndefined()
  //     expect(game.key).toBeUndefined()
  //     expect(game.metadata.start_time).toBeDefined()
  //     expect(game.metadata.end_time).not.toBeUndefined()
  //     expect(game.metadata.title).toBeDefined()
  //     expect(game.metadata.tournament).toBeDefined()
  //     expect(game.metadata.place).not.toBeNull()
  //     expect(game.metadata.strategy).not.toBeNull()
  //     console.log(game.game_id, game.metadata.start_time)
  //   }
  // })

  it('Loushou', async () => {
    const buffer = await fetch_igoshogi_game_list({
      ki: 46,
      type: 'L',
      block: 'k'
    })
    const { games, count } = decodeIKFList(buffer, 'L')
    expect(games.length).toBe(count)
    for (const game of games.sort((a, b) => b.game_id - a.game_id).slice(0, 10)) {
      expect(game.game_id).toBeDefined()
    }
  })

  it('Ginga', async () => {
    const buffer = await fetch_igoshogi_game_list({
      ki: 32,
      type: 'g',
      block: 'k'
    })
    const { games, count } = decodeIKFList(buffer, 'g')
    expect(games.length).toBe(count)
    for (const game of games.sort((a, b) => b.game_id - a.game_id)) {
      expect(game.game_id).toBeDefined()
    }
  })

  it('AI', async () => {
    const buffer = await fetch_ai_game_list()
    const { games, count } = decodeBJFList(buffer)
    expect(games.length).toBe(count)
    for (const game of games.sort((a, b) => b.game_id - a.game_id)) {
      expect(game.game_id).toBeDefined()
    }
  })

  it('Meijin', async () => {
    const buffer = await fetch_meijin_game_list()
    const { games, count } = decodeBIFList(buffer)
    expect(games.length).toBe(count)
    for (const game of games.sort((a, b) => b.game_id - a.game_id)) {
      expect(game.meijin_id).not.toBeUndefined()
      expect(game.key).not.toBeUndefined()
      expect(game.metadata.start_time).toBeDefined()
      expect(game.metadata.end_time).not.toBeUndefined()
      expect(game.metadata.title).toBeDefined()
      expect(game.metadata.tournament).toBeDefined()
      expect(game.metadata.place).not.toBeNull()
      expect(game.metadata.strategy).not.toBeNull()
      expect(game.black.rank).toBeDefined()
      expect(game.white.rank).toBeDefined()
      expect(game.black.rank === undefined).toBe(false)
      expect(game.white.rank === undefined).toBe(false)
    }
  })
})

describe('Parse Game', () => {
  // it('JSAM', async () => {
  //   const buffer = await fetch_jsam_game_list()
  //   const { games, count } = decodeBSAList(buffer)
  //   expect(games.length).toBe(count)
  //   for (const game of games.sort((a, b) => b.game_id - a.game_id)) {
  //     const buffer = await fetch_jsam_game({ game_id: game.game_id })
  //     const record: Record = importBSA(buffer)
  //     expect(record.moves.length).toBeGreaterThan(0)
  //   }

  //   for (const game of games.sort((a, b) => b.game_id - a.game_id)) {
  //     try {
  //       const buffer = await fetch_ai_game({ game_id: game.game_id })
  //       const record: Record = importBJF(buffer)
  //       expect(record.moves.length).toBeGreaterThan(0)
  //     } catch {
  //       console.error(game.game_id)
  //     }
  //   }
  // })

  it('Loushou', async () => {
    const buffer = await fetch_igoshogi_game_list({
      ki: 46,
      type: 'L',
      block: 'k'
    })
    const { games, count } = decodeIKFList(buffer, 'L')
    expect(games.length).toBe(count)
    for (const game of games.sort((a, b) => b.game_id - a.game_id)) {
      const buffer = await fetch_igoshogi_game({
        // biome-ignore lint/style/noNonNullAssertion: reason
        key: game.key!
      })
      expect(game.game_id).toBeDefined()
      doesNotThrow(() => importIKF(buffer, 'L'))
    }
  })

  it('Ginga', async () => {
    const buffer = await fetch_igoshogi_game_list({
      ki: 32,
      type: 'g',
      block: 'k'
    })
    const { games, count } = decodeIKFList(buffer, 'g')
    expect(games.length).toBe(count)
    for (const game of games.sort((a, b) => b.game_id - a.game_id)) {
      const buffer = await fetch_igoshogi_game({
        // biome-ignore lint/style/noNonNullAssertion: reason
        key: game.key!
      })
      doesNotThrow(() => importIKF(buffer, 'g'))
      expect(game.game_id).toBeDefined()
    }
  })

  it('AI', async () => {
    const buffer = await fetch_ai_game_list()
    const { games, count } = decodeBJFList(buffer)
    expect(games.length).toBe(count)
    for (const game of games
      .sort((a, b) => b.game_id - a.game_id)
      .filter((game) => game.game_id <= 100000)
      .slice(0, 5)) {
      try {
        const buffer = await fetch_ai_game({ game_id: game.game_id })
        const record: Record = importBJF(buffer)
        console.log(game.game_id, record.metadata.getStandardMetadata(RecordMetadataKey.TITLE))
      } catch (_error) {
        console.error(game.game_id)
      }
    }

    for (const game of games
      .sort((a, b) => b.game_id - a.game_id)
      .filter((game) => game.game_id <= 100000)
      .slice(0, 5)) {
      try {
        const buffer = await fetch_jsam_game({ game_id: game.game_id })
        const record: Record = importBSA(buffer)
        console.log(game.game_id, record.metadata.getStandardMetadata(RecordMetadataKey.TITLE))
      } catch (_error) {
        console.error(game.game_id)
      }
    }
  })

  it('Meijin', async () => {
    const buffer = await fetch_meijin_game_list()
    const { games, count } = decodeBIFList(buffer)
    expect(games.length).toBe(count)
    for (const game of games.sort((a, b) => b.game_id - a.game_id).slice(0, 10)) {
      // biome-ignore lint/style/noNonNullAssertion: reason
      const buffer = await fetch_meijin_game({ key: game.key! })
      const record: Record = importBIF(buffer)
      expect(game.black.rank).toBeDefined()
      expect(game.white.rank).toBeDefined()
      expect(record.metadata.getStandardMetadata(RecordMetadataKey.START_DATETIME)).toBeDefined()
      expect(record.metadata.getStandardMetadata(RecordMetadataKey.END_DATETIME)).toBeDefined()
      expect(record.moves.length).toBeGreaterThan(0)
    }
  })
})

describe('Equality', () => {
  const games: { game_id: number; key: string }[] = [
    {
      game_id: 19308,
      key: '/pay/kif/meijinsen/2025/09/24/A1/15048.txt'
    },
    {
      game_id: 19290,
      key: '/pay/kif/meijinsen/2025/09/23/A1/15050.txt'
    }
  ]
  it('Meijin', async () => {
    for (const game of games) {
      const a = importBSA(await fetch_jsam_game({ game_id: game.game_id }))
      const b = importBIF(await fetch_meijin_game({ key: game.key }))
      expect(a.moves.length).toBe(b.moves.length)
      expect(a.metadata.getStandardMetadata(RecordMetadataKey.TITLE)).toBe(
        b.metadata.getStandardMetadata(RecordMetadataKey.TITLE)
      )
      expect(a.metadata.getStandardMetadata(RecordMetadataKey.TOURNAMENT)).toBe(
        b.metadata.getStandardMetadata(RecordMetadataKey.TOURNAMENT)
      )
      expect(a.metadata.getStandardMetadata(RecordMetadataKey.LENGTH)).toBe(
        b.metadata.getStandardMetadata(RecordMetadataKey.LENGTH)
      )
      expect(a.metadata.getStandardMetadata(RecordMetadataKey.BLACK_NAME)).toBe(
        b.metadata.getStandardMetadata(RecordMetadataKey.BLACK_NAME)
      )
      expect(a.metadata.getStandardMetadata(RecordMetadataKey.WHITE_NAME)).toBe(
        b.metadata.getStandardMetadata(RecordMetadataKey.WHITE_NAME)
      )
      expect(a.metadata.getStandardMetadata(RecordMetadataKey.DATE)).toBe(
        b.metadata.getStandardMetadata(RecordMetadataKey.DATE)
      )
      expect(a.metadata.getStandardMetadata(RecordMetadataKey.START_DATETIME)).toBe(
        b.metadata.getStandardMetadata(RecordMetadataKey.START_DATETIME)
      )
      expect(a.metadata.getStandardMetadata(RecordMetadataKey.END_DATETIME)).toBe(
        b.metadata.getStandardMetadata(RecordMetadataKey.END_DATETIME)
      )
      expect(a.metadata.getStandardMetadata(RecordMetadataKey.PLACE)).toBe(
        b.metadata.getStandardMetadata(RecordMetadataKey.PLACE)
      )
      expect(a.metadata.getStandardMetadata(RecordMetadataKey.STRATEGY)).toBe(
        b.metadata.getStandardMetadata(RecordMetadataKey.STRATEGY)
      )
      expect(a.metadata.getStandardMetadata(RecordMetadataKey.TIME_LIMIT)).toBe(
        b.metadata.getStandardMetadata(RecordMetadataKey.TIME_LIMIT)
      )
    }
  })
})
