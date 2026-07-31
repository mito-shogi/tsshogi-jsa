import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { importCSA, type Record, RecordMetadataKey } from 'tsshogi'
import z from 'zod'
import { markerIndexes, parse } from '@/utils/parse'
import { BufferSchema } from '../buffer.dto'
import { type GameInfoList, type GameInfoListInput, GameInfoListSchema } from '../list.dto'
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
        comments: z.array(KCObjectSchema).nonempty(),
      }),
    )
    .parse(buffer)
  const record: Record | Error = importCSA(comments.map((comment) => comment.csa).join('\n'))
  if (record instanceof Error) {
    throw record
  }
  record.metadata.setStandardMetadata(RecordMetadataKey.BLACK_NAME, black.name)
  record.metadata.setStandardMetadata(RecordMetadataKey.WHITE_NAME, white.name)
  record.metadata.setStandardMetadata(
    RecordMetadataKey.DATE,
    dayjs(metadata.start_time).tz().format('YYYY/MM/DD'),
  )
  record.metadata.setStandardMetadata(
    RecordMetadataKey.START_DATETIME,
    dayjs(metadata.start_time).tz().toISOString(),
  )
  if (metadata.end_time) {
    record.metadata.setStandardMetadata(
      RecordMetadataKey.END_DATETIME,
      dayjs(metadata.end_time).tz().toISOString(),
    )
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
  record.metadata.setStandardMetadata(RecordMetadataKey.TITLE, metadata.title)
  return record
}

const BufferGameSchema = BufferSchema.transform((v) => {
  const BUFFER_OFFSET: number = 6
  const games: Buffer[] = Array.from(markerIndexes(v, Buffer.from([0x4b, 0x49])))
    .map((index) => ({ index, end: index + v.readUInt32BE(index + 2) + BUFFER_OFFSET }))
    .filter(({ end }) => end <= v.length)
    .map(({ index, end }) => v.subarray(index, end))
  return {
    games: games,
    count: games.length,
  }
})
  .pipe(
    z.object({
      games: z.array(
        SCObjectSchema.transform((v, ctx): GameInfoListInput['games'][number] => {
          if (v.tournament === undefined) {
            ctx.addIssue({ code: 'custom', message: `Unknown tournament: ${v.title}` })
            return z.NEVER
          }
          return {
            game_id: v.game_id,
            black: v.black,
            white: v.white,
            metadata: {
              date: dayjs.tz(v.start_time).format('YYYY/MM/DD'),
              start_time: v.start_time,
              end_time: v.end_time,
              title: v.title,
              tournament: v.tournament,
              length: v.moves,
            },
          }
        }),
      ),
      count: z.number().int(),
    }),
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
