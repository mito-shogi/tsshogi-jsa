import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import iconv from 'iconv-lite'
import { importCSA, type Record, RecordMetadataKey } from 'tsshogi'
import z from 'zod'
import { replaceAll } from '@/utils/convert'
import { parseName } from '@/utils/parse'
import { BufferSchema } from '../buffer.dto'
import type { GameInfoList } from '../list.dto'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)
dayjs.tz.setDefault('Asia/Tokyo')

const splitName = (fullName: string): { first_name: string; last_name: string } => {
  const patterns: string[] = ['佐々木', '三枚堂', '阿久津', '安用寺', '長谷部', '長谷川']
  const trimmed = fullName.trim()

  for (const pattern of patterns) {
    if (trimmed.startsWith(pattern)) {
      return {
        last_name: pattern,
        first_name: trimmed.slice(pattern.length)
      }
    }
  }

  const parts = trimmed.split(/\s+/).filter(Boolean)

  if (parts.length >= 2) {
    return {
      last_name: parts[0],
      first_name: parts.slice(1).join(' ')
    }
  }

  const last_name = trimmed.slice(0, 2)
  return {
    last_name,
    first_name: trimmed.slice(last_name.length)
  }
}

const KekkaSchema = z
  .object({
    KI: z.number().int(),
    BLOCK: z.enum(['k', 'K']),
    KAI: z.number().int(),
    KYOKU: z.number().int(),
    TAISENMEI: z.string().nonempty(),
    KEKKA: z.string(),
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
  .transform((v) => {
    const black = parseName(v.L_KISI_SEN === 1 ? replaceAll(v.L_KISI) : replaceAll(v.L_KISI))
    const white = parseName(v.R_KISI_SEN === 1 ? replaceAll(v.R_KISI) : replaceAll(v.R_KISI))
    const black_name = splitName(black.name)
    const white_name = splitName(white.name)
    return {
      game_id: (20500 + v.KI) * 10000 + v.KAI * 100 + v.KYOKU,
      key: `${v.BLOCK}0${v.KAI}0${v.KYOKU}`,
      ki: v.KI,
      black: {
        first_name: black_name.first_name,
        last_name: black_name.last_name,
        name: `${black_name.last_name} ${black_name.first_name}`,
        rank: black.rank,
        display_text: `${black_name.last_name} ${black_name.first_name} ${black.rank}`
      },
      white: {
        first_name: white_name.first_name,
        last_name: white_name.last_name,
        name: `${white_name.last_name} ${white_name.first_name}`,
        rank: white.rank,
        display_text: `${white_name.last_name} ${white_name.first_name} ${white.rank}`
      },
      metadata: {
        date: dayjs(v.TAIKYOKUDATE || v.HOUEIDATE)
          .tz()
          .format('YYYY/MM/DD'),
        start_time: v.TAIKYOKUDATE || v.HOUEIDATE,
        end_time: v.TAIKYOKUDATE,
        length: 0
      }
    }
  })

const BufferGameSchema = BufferSchema.transform((v) => JSON.parse(replaceAll(iconv.decode(v, 'shift_jis')))).pipe(
  z.object({
    status: z.boolean(),
    kekkas: z.array(KekkaSchema)
  })
)

const KIFSchema = z
  .object({
    status: z.boolean(),
    kifus: z.array(
      z.object({
        gyo: z.number().int(),
        data1: z.string().nonempty()
      })
    ),
    kekka: KekkaSchema
  })
  .transform((v) => ({
    ...v,
    comments: v.kifus.map((kifu) => ({
      csa: kifu.data1.trim()
    }))
  }))

/**
 * 将棋連盟モバイルのバイナリをRecord型の棋譜に変換します
 * @param buffer
 */
export const importIKF = (buffer: Buffer, type: 'L' | 'g'): Record => {
  const {
    kekka: { ki, black, white, metadata },
    comments
  } = BufferSchema.transform((v) => JSON.parse(iconv.decode(v, 'shift_jis')))
    .pipe(KIFSchema)
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

  record.metadata.setStandardMetadata(RecordMetadataKey.TOURNAMENT, type === 'L' ? '女流王将戦' : '銀河戦')
  if (metadata.length) {
    record.metadata.setStandardMetadata(RecordMetadataKey.LENGTH, record.moves.length.toString())
  }
  record.metadata.setStandardMetadata(
    RecordMetadataKey.TITLE,
    type === 'L' ? `霧島酒造杯第${ki}期女流王将戦` : `第${ki}期銀河戦`
  )
  return record
}

/**
 * 囲碁・将棋チャンネルの対局一覧のバイナリをデコードします
 * 旧形式: https://www.igoshogi.net/apis/kifu/readKekkaList.php?type=g&ki=1&block=A
 * 旧形式: https://www.igoshogi.net/apis/kifu/readKekkaList.php?type=L&ki=46&block=K
 * 新形式: https://www.igoshogi.net/shogi/Loushou/kifu.html?kifu=L46K0501
 * K: 決勝トーナメントを表し、他は単にブロックを意味している
 * @param buffer
 */
export const decodeIKFList = (buffer: Buffer, type: 'L' | 'g'): GameInfoList => {
  const result = BufferGameSchema.safeParse(buffer)
  if (!result.success) {
    throw result.error
  }
  return {
    games: result.data.kekkas.map(({ ki, game_id, metadata, ...rest }) => ({
      ...rest,
      key: `${type}${ki}${rest.key}`,
      game_id: type === 'L' ? game_id : game_id - 100000000,
      metadata: {
        ...metadata,
        title: type === 'L' ? `霧島酒造杯第${ki}期女流王将戦` : `第${ki}期銀河戦`,
        tournament: type === 'L' ? '女流王将戦' : '銀河戦'
      }
    })),
    count: result.data.kekkas.length
  }
}
