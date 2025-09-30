import { importCSA, type Record } from 'tsshogi'
import type { Tournament } from '@/constant/tournament'
import { type GameList, GameListObjectSchema } from '@/models/game.dto'
import { JSAObjectSchema } from '@/models/message.dto'

/**
 * 棋譜情報
 */
export type GameInfo = {
  game_id: number
  black: {
    first_name?: string
    last_name?: string
    name: string // RecordMetadataKey.BLACK_NAME
    rank?: string
    time_limit?: number | undefined // RecordMetadataKey.BLACK_TIME_LIMIT
  }
  white: {
    first_name?: string
    last_name?: string
    name: string // RecordMetadataKey.WHITE_NAME
    rank?: string | undefined
    time_limit?: number | undefined // RecordMetadataKey.WHITE_TIME_LIMIT
  }
  metadata: {
    date: string // RecordMetadataKey.DATE
    time_limit: number | undefined // RecordMetadataKey.TIME_LIMIT
    start_time: string // RecordMetadataKey.START_DATETIME
    end_time: string | null // RecordMetadataKey.END_DATETIME
    title: string // RecordMetadataKey.TITLE
    tournament: Tournament | null // RecordMetadataKey.TOURNAMENT
    length: number // RecordMetadataKey.LENGTH
    place?: string // RecordMetadataKey.PLACE
    strategy?: string // RecordMetadataKey.STRATEGY
  }
  kif: string
}

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
