import z from 'zod'
import { BufferSchema } from './buffer.dto'
import { SCObjectSchema } from './message.dto'

export const GameListSchema = z.object({
  games: z.array(SCObjectSchema),
  count: z.number().int()
})
export type GameList = z.infer<typeof GameListSchema>

const decodeGameList = (buffer: Buffer) => {
  let index = 0
  const games: Buffer[] = []
  // biome-ignore lint/suspicious/noAssignInExpressions: reason
  while ((index = buffer.indexOf(Buffer.from([0x4b, 0x49]), index + 1)) !== -1) {
    // インデックスが範囲外になる場合には終了する
    if (index + 6 >= buffer.length) {
      break
    }
    // 長さを取得する
    const length: number = buffer.readUInt32BE(index + 2)
    if (buffer.slice(index, index + length + 6).length >= length) {
      games.push(buffer.slice(index, index + length + 6))
    }
  }
  return {
    games: games,
    count: games.length
  }
}

export const GameListObjectSchema = BufferSchema.transform(decodeGameList).pipe(GameListSchema)
