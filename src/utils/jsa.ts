import { importCSA, type Record } from 'tsshogi'
import { type GameList, GameListObjectSchema } from '@/models/game.dto'
import { type GameInfo, JSAObjectSchema } from '@/models/message.dto'

export const decodeJSA = (buffer: Buffer): GameInfo => {
  const result = JSAObjectSchema.safeParse(buffer)
  if (!result.success) {
    console.error('Failed to decode JSA:', result.error)
    throw result.error
  }
  return result.data
}

/**
 * JSA形式の棋譜を読み取ります。
 * @param buffer
 */
export const importJSA = (buffer: Buffer): Record => {
  const result = JSAObjectSchema.safeParse(buffer)
  if (!result.success) {
    throw result.error
  }
  const record = importCSA(result.data.comments.map((comment) => comment.csa).join('\n'))
  if (record instanceof Error) {
    if (import.meta.env.NODE_ENV === 'test') {
      console.error('Failed to import CSA:')
      throw record
    }
    throw record
  }
  record
  for (const metadata of result.data.metadata) {
    // console.debug('Setting metadata:', metadata)
    record.metadata.setStandardMetadata(metadata.key, metadata.value)
  }
  return record
}

/**
 * バッファーから対局リストにデコードします
 * @param buffer
 * @returns
 */
export const decodeGameList = (buffer: Buffer): GameList => {
  const result = GameListObjectSchema.safeParse(buffer)
  if (!result.success) {
    console.error('Failed to decode GameList:', result.error)
    throw result.error
  }
  return result.data
}
