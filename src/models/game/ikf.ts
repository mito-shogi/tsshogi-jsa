import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import iconv from 'iconv-lite'
import { importCSA, type Record, RecordMetadataKey } from 'tsshogi'
import z from 'zod'
import { replaceAll } from '@/utils/convert'
import { parse, parseName } from '@/utils/parse'
import { BufferSchema } from '../buffer.dto'
import type { GameInfoList } from '../list.dto'
import { BIObjectSchema, KCObjectSchema, KIObjectSchema } from '../message.dto'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)
dayjs.tz.setDefault('Asia/Tokyo')

/**
 * 将棋連盟モバイルのバイナリをRecord型の棋譜に変換します
 * @param buffer
 */
export const importIKF = (buffer: Buffer): Record => {
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
  record.metadata.setStandardMetadata(RecordMetadataKey.DATE, dayjs(metadata.start_time).tz().format('YYYY/MM/DD'))
  record.metadata.setStandardMetadata(RecordMetadataKey.START_DATETIME, dayjs(metadata.start_time).tz().toISOString())
  if (metadata.end_time) {
    record.metadata.setStandardMetadata(RecordMetadataKey.END_DATETIME, dayjs(metadata.end_time).tz().toISOString())
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

const BufferGameSchema = BufferSchema.transform((v) => JSON.parse(replaceAll(iconv.decode(v, 'shift_jis')))).pipe(
  z.object({
    status: z.boolean(),
    kekkas: z.array(
      z.object({
        KI: z.number().int(),
        BLOCK: z.literal('K'),
        KAI: z.number().int(),
        KYOKU: z.number().int(),
        TAISENMEI: z.string().nonempty(),
        KEKKA: z.string().nonempty(),
        KAISETU: z.string(),
        KIKITE: z.string(),
        L_KISI: z.string().nonempty(),
        L_KISI_ITI: z.number().int(),
        L_KISI_LBL: z.string().nonempty(),
        L_KISI_SEN: z.number().int(),
        L_KISI_WIN: z.number().int(),
        R_KISI: z.string().nonempty(),
        R_KISI_ITI: z.number().int(),
        R_KISI_LBL: z.string().nonempty(),
        R_KISI_SEN: z.number().int(),
        R_KISI_WIN: z.number().int(),
        HOUEIDATE: z.string().nonempty(),
        TAIKYOKUDATE: z.string().nonempty().nullable(),
        KOKAIDATE: z.string().nonempty(),
        KIFU: z.number().int()
      })
    )
  })
)

/**
 * 囲碁・将棋チャンネルの対局一覧のバイナリをデコードします
 * 旧形式: https://www.igoshogi.net/apis/kifu/readKekkaList.php?type=g&ki=1&block=A
 * 旧形式: https://www.igoshogi.net/apis/kifu/readKekkaList.php?type=L&ki=46&block=K
 * 新形式: https://www.igoshogi.net/shogi/Loushou/kifu.html?kifu=L46K0501
 * K: 決勝トーナメントを表し、他は単にブロックを意味している
 * @param buffer
 */
export const decodeIKFList = (buffer: Buffer): GameInfoList => {
  const result = BufferGameSchema.safeParse(buffer)
  if (!result.success) {
    throw result.error
  }
  return {
    games: result.data.kekkas.map((kekka) => {
      const black = parseName(kekka.L_KISI_SEN === 1 ? kekka.L_KISI : kekka.L_KISI)
      const white = parseName(kekka.R_KISI_SEN === 1 ? kekka.R_KISI : kekka.R_KISI)
      return {
        game_id: 0,
        key: `L${kekka.KI}0${kekka.KAI}0${kekka.KYOKU}`,
        black: {
          name: replaceAll(black.name),
          rank: black.rank
        },
        white: {
          name: replaceAll(white.name),
          rank: white.rank
        },
        metadata: {
          date: dayjs(kekka.TAIKYOKUDATE).tz().format('YYYY/MM/DD'),
          start_time: kekka.TAIKYOKUDATE,
          end_time: kekka.TAIKYOKUDATE
        }
      }
    }),
    count: result.data.kekkas.length
  }
}
