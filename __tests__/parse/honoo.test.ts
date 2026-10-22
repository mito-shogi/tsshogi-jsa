import { describe, expect, it } from 'bun:test'
import { KITransform, SCSchema } from '../../src/models/message.dto'

const game = {
  length: 200,
  game_id: 14000,
  start_time: '202610041330',
  end_time: '202610041800',
  moves: 80,
}
const player = { first_name: '太郎', last_name: '将棋', rank: '九段' }

const titles = [
  '【無料】渡辺明九段 vs S6炎の六番勝負第1局',
  '渡辺明九段 vs S6炎の六番勝負第2局',
  '渡辺明九段 vs S6炎の六番勝負第6局',
]

describe('JSAM 炎の六番勝負 recognition', () => {
  for (const title of titles) {
    it(`一覧と棋譜で大会を認識する: ${title}`, () => {
      const sc = SCSchema.safeParse({ ...game, type: 'SC', title, black: player, white: player })
      const ki = KITransform.safeParse({
        ...game,
        type: 'KI',
        title,
        time: 600,
        strategy: undefined,
        place: undefined,
      })
      expect(sc.success).toBe(true)
      expect(ki.success).toBe(true)
      if (!sc.success || !ki.success) throw new Error('Invalid tournament fixture')
      expect(sc.data.tournament).toBe('炎の六番勝負')
      expect(ki.data.tournament).toBe('炎の六番勝負')
    })
  }

  it('未知の大会を誤認しない', () => {
    const sc = SCSchema.safeParse({
      ...game,
      type: 'SC',
      title: '未知の大会',
      black: player,
      white: player,
    })
    expect(sc.success).toBe(true)
    if (!sc.success) throw new Error('Invalid tournament fixture')
    expect(sc.data.tournament).toBeUndefined()
  })
})
