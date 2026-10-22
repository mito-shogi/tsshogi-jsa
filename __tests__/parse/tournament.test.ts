import { describe, expect, it } from 'bun:test'
import { KITransform, SCSchema } from '../../src/models/message.dto'

const titles = [
  '熊本地震復興支援イベント in 関西 記念ペア対局「夫婦 vs 絆」',
  '熊本地震復興支援イベント in 関西 特選対局',
]

const game = {
  length: 200,
  game_id: 14000,
  start_time: '201610011000',
  end_time: '201610011200',
  moves: 80,
}

const player = { first_name: '太郎', last_name: '将棋', rank: '九段' }

describe('JSAM tournament recognition', () => {
  for (const title of titles) {
    it(`一覧と棋譜で復興支援イベントを認識する: ${title}`, () => {
      const sc = SCSchema.parse({ ...game, type: 'SC', title, black: player, white: player })
      const ki = KITransform.parse({
        ...game,
        type: 'KI',
        title,
        time: 600,
        strategy: undefined,
        place: undefined,
      })
      expect(sc.tournament).toBe('熊本地震復興支援イベント')
      expect(ki.tournament).toBe(sc.tournament)
    })
  }

  it('未知のタイトルを既知のイベントとして扱わない', () => {
    const sc = SCSchema.parse({
      ...game,
      type: 'SC',
      title: '未知の大会',
      black: player,
      white: player,
    })
    expect(sc.tournament).toBeUndefined()
  })
})
