import { describe, expect, it } from 'bun:test'
import { RecordMetadataKey } from 'tsshogi'
import { decodeBSAList, importBSA } from '../../src/models/game/jsam.dto'
import { decodeBIFList, importBIF } from '../../src/models/game/meijin.dto'
import { fetch_jsam_game, fetch_jsam_game_list, fetch_meijin_game, fetch_meijin_game_list } from '../utils/client'

describe('Parse Game List', () => {
  it('JSAM', async () => {
    const buffer = await fetch_jsam_game_list()
    const { games, count } = decodeBSAList(buffer)
    expect(games.length).toBe(count)
  })

  it('Meijin', async () => {
    const buffer = await fetch_meijin_game_list()
    const { games, count } = decodeBIFList(buffer)
    expect(games.length).toBe(count)
  })
})

describe('Parse Game', () => {
  it('JSAM', async () => {
    const buffer = await fetch_jsam_game_list()
    const { games, count } = decodeBSAList(buffer)
    expect(games.length).toBe(count)
    for (const game of games) {
      const buffer = await fetch_jsam_game({ game_id: game.game_id })
      const record = importBSA(buffer)
      expect(record.moves.length).toBeGreaterThan(0)
    }
  })

  it('Meijin', async () => {
    const buffer = await fetch_meijin_game_list()
    const { games, count } = decodeBIFList(buffer)
    expect(games.length).toBe(count)
    for (const game of games) {
      // biome-ignore lint/style/noNonNullAssertion: reason
      const buffer = await fetch_meijin_game({ key: game.key! })
      const record = importBIF(buffer)
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
