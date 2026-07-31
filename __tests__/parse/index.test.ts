import { beforeAll, describe, expect, it } from 'bun:test'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { type Record, RecordMetadataKey } from 'tsshogi'
import { decodeBJFList, importBJF } from '../../src/models/game/ai.dto'
import { decodeIKFList, importIKF } from '../../src/models/game/ikf.dto.ts'
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
  fetch_meijin_game_list,
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

  it('JSAM 14000', async () => {
    const buffer = await fetch_jsam_game_list({ p1: 0, p2: 14000, p3: 3 })
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
      console.log(game.game_id, game.metadata.start_time)
    }
  })

  for (const ki of [32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46].slice(-3)) {
    it(`Loushou ${ki}`, async () => {
      const buffer = await fetch_igoshogi_game_list({
        ki: ki,
        type: 'L',
        block: 'k',
      })
      const { games, count } = decodeIKFList(buffer, 'L')
      expect(games.length).toBe(count)
      for (const game of games.sort((a, b) => b.game_id - a.game_id).slice(0, 5)) {
        expect(game.game_id).toBeDefined()
      }
    })
  }

  for (const ki of [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
    27, 28, 29, 30, 31, 32,
  ].slice(-3)) {
    it(`Ginga ${ki}`, async () => {
      const buffer = await fetch_igoshogi_game_list({
        ki: ki,
        type: 'g',
        block: 'k',
      })
      const { games, count } = decodeIKFList(buffer, 'g')
      expect(games.length).toBe(count)
      for (const game of games.sort((a, b) => b.game_id - a.game_id).slice(0, 1)) {
        expect(game.game_id).toBeDefined()
      }
    })
  }

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

  it('AI', async () => {
    const buffer = await fetch_ai_game_list()
    const { games } = decodeBJFList(buffer)
    // 一部の game_id は棋譜が存在せず 403 を返す。取得できたものだけを検証対象にする
    const records: Record[] = []
    for (const game of games.sort((a, b) => b.game_id - a.game_id).slice(0, 10)) {
      const buffer = await fetch_ai_game({ game_id: game.game_id }).catch(() => null)
      if (buffer === null) {
        continue
      }
      records.push(importBJF(buffer))
    }
    expect(records.length).toBeGreaterThan(0)
    for (const record of records) {
      expect(record.moves.length).toBeGreaterThan(0)
      expect(record.metadata.getStandardMetadata(RecordMetadataKey.TITLE)).toBeDefined()
      expect(record.metadata.getStandardMetadata(RecordMetadataKey.START_DATETIME)).toBeDefined()
      expect(record.metadata.getStandardMetadata(RecordMetadataKey.BLACK_NAME)).toBeDefined()
      expect(record.metadata.getStandardMetadata(RecordMetadataKey.WHITE_NAME)).toBeDefined()
    }
  })

  // 囲碁将棋チャンネルの棋譜データ API が廃止されているため skip している。
  //   https://www.igoshogi.net/apis/kifu/readKifuData.php?KIFU=<key>
  //   → HTTP 500 / body 0 バイト（L46K0501, L46K0102, g32A0101, g32K0101 で確認。2026-07-30 再確認）
  // 対局一覧 API（readKekkaList.php）は健在なので `Parse Game List > Loushou/Ginga` は有効なまま。
  // skip の影響を受けるのは importIKF のカバレッジのみ。
  // 復旧または新形式（https://www.igoshogi.net/shogi/Loushou/kifu.html?kifu=<key>）へ
  // 移行したら、client.ts の `fetch_igoshogi_game` の URL を差し替えて it.skip を it に戻す。
  for (const { type, block, ki } of [
    { type: 'L', block: 'k', ki: 46 },
    { type: 'g', block: 'k', ki: 32 },
    { type: 'g', block: 'A', ki: 32 },
  ] as const) {
    it.skip(`${type === 'L' ? 'Loushou' : 'Ginga'} ${ki}${block}`, async () => {
      const buffer = await fetch_igoshogi_game_list({ ki, type, block })
      const { games, count } = decodeIKFList(buffer, type)
      expect(games.length).toBe(count)
      for (const game of games.sort((a, b) => b.game_id - a.game_id).slice(0, 1)) {
        // biome-ignore lint/style/noNonNullAssertion: 一覧が返す棋譜は必ず key を持つ
        const buffer = await fetch_igoshogi_game({ key: game.key! })
        const record: Record = importIKF(buffer, type)
        expect(record.moves.length).toBeGreaterThan(0)
      }
    })
  }

  it('Meijin', async () => {
    const buffer = await fetch_meijin_game_list()
    const { games, count } = decodeBIFList(buffer)
    expect(games.length).toBe(count)
    // 当日の対局は終局前だと END_DATETIME を持たないため、終局済みのみを対象にする。
    // slice より前に除外しないと検証対象が 10 件を割る
    const finished = games
      .filter((game) => game.metadata.end_time !== null)
      .sort((a, b) => b.game_id - a.game_id)
      .slice(0, 10)
    expect(finished.length).toBeGreaterThan(0)
    for (const game of finished) {
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
      key: '/pay/kif/meijinsen/2025/09/24/A1/15048.txt',
    },
    {
      game_id: 19290,
      key: '/pay/kif/meijinsen/2025/09/23/A1/15050.txt',
    },
  ]
  it('Meijin', async () => {
    for (const game of games) {
      const a = importBSA(await fetch_jsam_game({ game_id: game.game_id }))
      const b = importBIF(await fetch_meijin_game({ key: game.key }))
      expect(a.moves.length).toBe(b.moves.length)
      expect(a.metadata.getStandardMetadata(RecordMetadataKey.TITLE)).toBe(
        b.metadata.getStandardMetadata(RecordMetadataKey.TITLE),
      )
      expect(a.metadata.getStandardMetadata(RecordMetadataKey.TOURNAMENT)).toBe(
        b.metadata.getStandardMetadata(RecordMetadataKey.TOURNAMENT),
      )
      expect(a.metadata.getStandardMetadata(RecordMetadataKey.LENGTH)).toBe(
        b.metadata.getStandardMetadata(RecordMetadataKey.LENGTH),
      )
      expect(a.metadata.getStandardMetadata(RecordMetadataKey.BLACK_NAME)).toBe(
        b.metadata.getStandardMetadata(RecordMetadataKey.BLACK_NAME),
      )
      expect(a.metadata.getStandardMetadata(RecordMetadataKey.WHITE_NAME)).toBe(
        b.metadata.getStandardMetadata(RecordMetadataKey.WHITE_NAME),
      )
      expect(a.metadata.getStandardMetadata(RecordMetadataKey.DATE)).toBe(
        b.metadata.getStandardMetadata(RecordMetadataKey.DATE),
      )
      expect(a.metadata.getStandardMetadata(RecordMetadataKey.START_DATETIME)).toBe(
        b.metadata.getStandardMetadata(RecordMetadataKey.START_DATETIME),
      )
      expect(a.metadata.getStandardMetadata(RecordMetadataKey.END_DATETIME)).toBe(
        b.metadata.getStandardMetadata(RecordMetadataKey.END_DATETIME),
      )
      expect(a.metadata.getStandardMetadata(RecordMetadataKey.PLACE)).toBe(
        b.metadata.getStandardMetadata(RecordMetadataKey.PLACE),
      )
      expect(a.metadata.getStandardMetadata(RecordMetadataKey.STRATEGY)).toBe(
        b.metadata.getStandardMetadata(RecordMetadataKey.STRATEGY),
      )
      expect(a.metadata.getStandardMetadata(RecordMetadataKey.TIME_LIMIT)).toBe(
        b.metadata.getStandardMetadata(RecordMetadataKey.TIME_LIMIT),
      )
    }
  })
})
