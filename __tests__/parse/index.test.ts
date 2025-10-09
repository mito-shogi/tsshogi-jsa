import { describe, expect, it } from 'bun:test'
import { type Record, RecordMetadataKey } from 'tsshogi'
import { decodeBSAList, importBSA } from '../../src/models/game/jsam.dto'
import { decodeBIFList, importBIF } from '../../src/models/game/meijin.dto'
import { fetch_jsam_game, fetch_jsam_game_list, fetch_meijin_game, fetch_meijin_game_list } from '../utils/client'

describe('Parse Game List', () => {
  it('JSAM 100', async () => {
    const buffer = await fetch_jsam_game_list({ p1: 0, p2: 100, p3: 1 })
    const { games, count } = decodeBSAList(buffer)
    expect(games.length).toBe(count)
    expect(games.length).toBeGreaterThan(1)
    for (const game of games) {
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

  it('JSAM 200', async () => {
    const buffer = await fetch_jsam_game_list({ p1: 0, p2: 200, p3: 2 })
    const { games, count } = decodeBSAList(buffer)
    expect(games.length).toBe(count)
    expect(games.length).toBeGreaterThan(1)
    for (const game of games) {
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

  it('JSAM 14000', async () => {
    const buffer = await fetch_jsam_game_list({ p1: 0, p2: 14000, p3: 3 })
    const { games, count } = decodeBSAList(buffer)
    expect(games.length).toBe(count)
    expect(games.length).toBeGreaterThan(1)
    for (const game of games) {
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
  it('JSAM', async () => {
    const buffer = await fetch_jsam_game_list()
    const { games, count } = decodeBSAList(buffer)
    expect(games.length).toBe(count)
    for (const game of games.sort((a, b) => b.game_id - a.game_id)) {
      const buffer = await fetch_jsam_game({ game_id: game.game_id })
      const record: Record = importBSA(buffer)
      expect(record.moves.length).toBeGreaterThan(0)
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
