import { importCSA, type Record } from 'tsshogi'
import { type GameList, GameListObjectSchema } from '@/models/game.dto'
import { JSAObjectSchema } from '@/models/message.dto'

/**
 * JSA形式の棋譜を読み取ります。
 * @param buffer
 */
export const importJSA = (buffer: Buffer): Record | Error => {
  const result = JSAObjectSchema.safeParse(buffer)
  // console.log('JSA parsing result:', result)
  if (!result.success) {
    throw result.error
  }
  const record = importCSA(result.data.comments.map((comment) => comment.csa).join('\n'))
  if (record instanceof Error) {
    if (import.meta.env.NODE_ENV === 'test') {
      throw record
    }
    return record
  }
  for (const metadata of result.data.metadata) {
    console.log('Setting metadata:', metadata)
    record.metadata.setStandardMetadata(metadata.key, metadata.value)
  }
  return record
}

export const decodeGameList = (buffer: Buffer): GameList => {
  const result = GameListObjectSchema.safeParse(buffer)
  if (!result.success) {
    console.error('Failed to decode GameList:', result.error)
    throw result.error
  }
  return result.data
}
