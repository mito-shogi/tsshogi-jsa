import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import iconv from 'iconv-lite'
import { exportJKFString, importJKFString, importKIF, type Record, RecordMetadataKey } from 'tsshogi'
import z from 'zod'
import { TournamentList } from '@/constant/tournament'
import { replaceAll, toNormalizeDate } from '@/utils/convert'
import { parseName } from '@/utils/parse'
import { BufferSchema } from '../buffer.dto'
import { type GameInfoList, GameInfoListSchema } from '../list.dto'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)
dayjs.tz.setDefault('Asia/Tokyo')

/**
 * 名人戦棋譜速報のバイナリをRecord型の棋譜に変換します
 * @param buffer
 */
export const importBIF = (buffer: Buffer): Record => {
  const record: Record | Error = (() => {
    const record: Record | Error = importKIF(iconv.decode(buffer, 'shift_jis'))
    if (record instanceof Error) {
      throw record
    }
    return importJKFString(replaceAll(exportJKFString(record)))
  })()
  if (record instanceof Error) {
    throw record
  }
  const start_time: string | undefined = record.metadata.getStandardMetadata(RecordMetadataKey.START_DATETIME)
  if (start_time) {
    record.metadata.setStandardMetadata(
      RecordMetadataKey.START_DATETIME,
      dayjs.tz(start_time).format('YYYY/MM/DD HH:mm:ss')
    )
    record.metadata.setStandardMetadata(RecordMetadataKey.DATE, dayjs.tz(start_time).format('YYYY/MM/DD'))
  }
  const end_time: string | undefined = record.metadata.getStandardMetadata(RecordMetadataKey.END_DATETIME)
  if (end_time) {
    record.metadata.setStandardMetadata(
      RecordMetadataKey.END_DATETIME,
      dayjs.tz(end_time).format('YYYY/MM/DD HH:mm:ss')
    )
  }
  const time_limit: string | undefined = record.metadata.getStandardMetadata(RecordMetadataKey.TIME_LIMIT)
  if (time_limit) {
    const match = time_limit.match(/^(\d+)/)
    if (match) {
      const value: number = Number.parseInt(match[1], 10)
      if (!Number.isNaN(value)) {
        record.metadata.setStandardMetadata(RecordMetadataKey.TIME_LIMIT, `${value * 60}`)
        record.metadata.setStandardMetadata(RecordMetadataKey.BLACK_TIME_LIMIT, `${value * 60}`)
        record.metadata.setStandardMetadata(RecordMetadataKey.WHITE_TIME_LIMIT, `${value * 60}`)
      }
    }
  }
  const delay: string | undefined = record.metadata.getStandardMetadata(RecordMetadataKey.BYOYOMI)
  if (delay) {
    const match = delay.match(/^(\d+)/)
    if (match) {
      const value: number = Number.parseInt(match[1], 10)
      if (!Number.isNaN(value)) {
        record.metadata.setStandardMetadata(RecordMetadataKey.BYOYOMI, `${value}`)
      }
    }
  }
  const black_name: string | undefined = record.metadata.getStandardMetadata(RecordMetadataKey.BLACK_NAME)
  if (black_name) {
    record.metadata.setStandardMetadata(RecordMetadataKey.BLACK_NAME, parseName(black_name).name)
  }
  const white_name: string | undefined = record.metadata.getStandardMetadata(RecordMetadataKey.WHITE_NAME)
  if (white_name) {
    record.metadata.setStandardMetadata(RecordMetadataKey.WHITE_NAME, parseName(white_name).name)
  }
  const note = record.metadata.getStandardMetadata(RecordMetadataKey.NOTE)
  if (note) {
    record.metadata.setStandardMetadata(RecordMetadataKey.NOTE, note.replaceAll('\\n', ''))
  }
  const title: string | undefined = record.metadata.getStandardMetadata(RecordMetadataKey.TOURNAMENT)
  if (title) {
    const tournament: string | undefined = TournamentList.find((t) => t.keys.some((key) => title.includes(key)))?.value
    record.metadata.setStandardMetadata(RecordMetadataKey.TITLE, title)
    if (tournament) {
      record.metadata.setStandardMetadata(RecordMetadataKey.TOURNAMENT, tournament)
    }
  }
  record.metadata.setStandardMetadata(RecordMetadataKey.LENGTH, (record.moves.length - 2).toString())
  return record
}

const BufferGameSchema = BufferSchema.transform((v) => replaceAll(iconv.decode(v, 'shift_jis')))
  .pipe(z.string().nonempty())
  .transform((v) => {
    const blocks: string[] = v.split('/-----').map((line) => line.trim())
    if (blocks.length === 0) {
      throw new Error('No data found')
    }
    return {
      games: blocks.slice(1, -1).map((block) =>
        Object.fromEntries(
          block.split('\n').map((line) =>
            line
              .replace(/\s*\/\/.*$/, '')
              .split('=')
              .map((s) => s.trim())
          )
        )
      ),
      count: blocks.slice(1, -1).length
    }
  })
  .pipe(
    z.object({
      games: z.array(
        z.object({
          game_id: z.coerce.number().int(),
          meijin_id: z.coerce.number().int(),
          kif_key: z.string().nonempty(),
          start_date: z.string().nonempty(),
          end_date: z.preprocess(
            // biome-ignore lint/suspicious/noExplicitAny: reason
            (input: any) => (input.length === 0 ? undefined : input),
            z.string().nonempty().optional()
          ),
          kisen: z.string().nonempty(),
          sente: z.string().nonempty(),
          gote: z.string().nonempty(),
          family1: z.string().nonempty(),
          name1: z.string().nonempty(),
          title1: z.string().nonempty(),
          family2: z.string().nonempty(),
          name2: z.string().nonempty(),
          title2: z.string().nonempty(),
          senkei: z.preprocess(
            // biome-ignore lint/suspicious/noExplicitAny: reason
            (input: any) => (input === undefined || input.length === 0 ? undefined : input),
            z.string().nonempty().optional()
          ),
          tesuu: z.coerce.number().int()
        })
      ),
      count: z.number().int()
    })
  )
  .transform(
    (v) =>
      ({
        games: v.games.map((v) => ({
          game_id: v.game_id,
          meijin_id: v.meijin_id,
          key: v.kif_key,
          black: {
            first_name: v.name1,
            last_name: v.family1,
            rank: v.title1,
            name: `${v.family1} ${v.name1}`,
            display_text: `${v.family1} ${v.name1} ${v.title1}`
          },
          white: {
            first_name: v.name2,
            last_name: v.family2,
            rank: v.title2,
            name: `${v.family2} ${v.name2}`,
            display_text: `${v.family2} ${v.name2} ${v.title2}`
          },
          metadata: {
            date: dayjs.tz(v.start_date).format('YYYY/MM/DD'),
            start_time: toNormalizeDate(v.start_date),
            end_time: v.end_date === undefined ? null : toNormalizeDate(v.end_date),
            title: v.kisen,
            tournament: TournamentList.find((t) => t.keys.some((key) => v.kisen.includes(key)))?.value,
            length: v.tesuu,
            strategy: v.senkei
          },
          kif: null
        })),
        count: v.count
        // biome-ignore lint/suspicious/noExplicitAny: reason
      }) as any
  )
  .pipe(GameInfoListSchema)

/**
 * 名人戦棋譜速報の対局一覧のバイナリをデコードします
 * @param buffer
 */
export const decodeBIFList = (buffer: Buffer): GameInfoList => {
  const result = BufferGameSchema.safeParse(buffer)
  if (!result.success) {
    throw result.error
  }
  return result.data
}
