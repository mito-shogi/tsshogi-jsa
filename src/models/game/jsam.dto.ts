import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { importCSA, type Record, RecordMetadataKey } from 'tsshogi'
import z from 'zod'
import { parse } from '@/utils/parse'
import { BufferSchema } from '../buffer.dto'
import { type GameInfoList, GameInfoListSchema } from '../list.dto'
import { BIObjectSchema, KCObjectSchema, KIObjectSchema, SCObjectSchema } from '../message.dto'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)
dayjs.tz.setDefault('Asia/Tokyo')

/**
 * 将棋連盟モバイルのバイナリをRecord型の棋譜に変換します
 * @param buffer
 */
export const importBSA = (buffer: Buffer): Record => {
  const { metadata, black, white, comments } = BufferSchema.transform(parse)
    .pipe(
      z.object({
        metadata: KIObjectSchema,
        black: BIObjectSchema,
        white: BIObjectSchema,
        comments: z.array(KCObjectSchema).nonempty()
      })
    )
    .parse(buffer)
  const record: Record | Error = importCSA(comments.map((comment) => comment.csa).join('\n'))
  if (record instanceof Error) {
    throw record
  }
  record.metadata.setStandardMetadata(RecordMetadataKey.BLACK_NAME, black.name)
  record.metadata.setStandardMetadata(RecordMetadataKey.WHITE_NAME, white.name)
  record.metadata.setStandardMetadata(RecordMetadataKey.DATE, dayjs.tz(metadata.start_time).format('YYYY/MM/DD'))
  record.metadata.setStandardMetadata(RecordMetadataKey.START_DATETIME, dayjs.tz(metadata.start_time).toISOString())
  if (metadata.end_time) {
    record.metadata.setStandardMetadata(RecordMetadataKey.END_DATETIME, dayjs.tz(metadata.end_time).toISOString())
  }
  if (metadata.place) {
    record.metadata.setStandardMetadata(RecordMetadataKey.PLACE, metadata.place)
  }
  if (metadata.tournament) {
    record.metadata.setStandardMetadata(RecordMetadataKey.TOURNAMENT, metadata.tournament)
  }
  if (metadata.length) {
    record.metadata.setStandardMetadata(RecordMetadataKey.LENGTH, metadata.moves.toString())
  }
  if (metadata.strategy) {
    record.metadata.setStandardMetadata(RecordMetadataKey.STRATEGY, metadata.strategy)
  }
  if (metadata.time) {
    record.metadata.setStandardMetadata(RecordMetadataKey.TIME_LIMIT, metadata.time.toString())
  }
  if (metadata.tournament) {
    record.metadata.setStandardMetadata(RecordMetadataKey.TOURNAMENT, metadata.tournament)
  }
  record.metadata.setStandardMetadata(RecordMetadataKey.TITLE, metadata.title)
  return record
}

const BufferGameSchema = BufferSchema.transform((v) => {
  let index = 0
  const BUFFER_OFFSET: number = 6
  const games: Buffer[] = []
  // biome-ignore lint/suspicious/noAssignInExpressions: reason
  while ((index = v.indexOf(Buffer.from([0x4b, 0x49]), index + 1)) !== -1) {
    // 長さを取得する
    const length: number = v.readUInt32BE(index + 2)
    if (v.slice(index, index + length + BUFFER_OFFSET).length >= length) {
      if (index + length + BUFFER_OFFSET <= v.length) {
        games.push(v.slice(index, index + length + BUFFER_OFFSET))
      }
    }
  }
  return {
    games: games,
    count: games.length
  }
})
  .pipe(
    z.object({
      games: z.array(
        SCObjectSchema.transform((v) => ({
          game_id: v.game_id,
          meijin_id: undefined,
          key: undefined,
          black: v.black,
          white: v.white,
          metadata: {
            date: dayjs.tz(v.start_time).format('YYYY/MM/DD'),
            start_time: v.start_time,
            end_time: v.end_time,
            title: v.title,
            tournament: v.tournament,
            length: v.moves
          },
          kif: null
        }))
      ),
      count: z.number().int()
      // biome-ignore lint/suspicious/noExplicitAny: reason
    }) as any
  )
  .pipe(GameInfoListSchema)

/**
 * 将棋連盟モバイルの対局一覧のバイナリをデコードします
 * @param buffer
 */
export const decodeBSAList = (buffer: Buffer): GameInfoList => {
  const result = BufferGameSchema.safeParse(buffer)
  if (!result.success) {
    throw result.error
  }
  return result.data
}
