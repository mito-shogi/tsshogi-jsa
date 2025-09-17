import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { RecordMetadataKey } from 'tsshogi'
import z from 'zod'
import { PieceTypeEnum } from '@/constant/piece'
import { Tournament, TournamentList } from '@/constant/tournament'
import { decodeBI, decodeJSA, decodeKC, decodeKI, decodeSC } from '@/utils/decode'
import { BufferSchema } from './buffer.dto'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)
dayjs.tz.setDefault('Asia/Tokyo')

export const MessageTypeEnum = z.enum(['KI', 'BI', 'KC', 'CT', 'SC'])

/**
 * 棋譜情報
 */
export const KISchema = z.object({
  type: z.literal(MessageTypeEnum.enum.KI),
  length: z.number().int().min(0),
  game_id: z.number().int().min(0),
  start_time: z.string().nonempty(),
  end_time: z.string().nonempty().nullable(),
  title: z.string().nonempty(),
  moves: z.number().int().min(0).max(512)
})

export type KI = z.infer<typeof KISchema>

export const KITransform = KISchema.extend({
  time: z.number().int(),
  opening: z.string().nullable(),
  location: z.string().nonempty().nullable()
})
  .transform((v) => ({
    ...v,
    tournament: TournamentList.find((t) => t.keys.some((key) => v.title.includes(key)))?.value
  }))
  .transform((v) => ({
    ...v,
    metadata: ((): { key: RecordMetadataKey; value: string }[] => {
      const metadata = [
        {
          key: RecordMetadataKey.TITLE,
          value: v.title
        },
        {
          key: RecordMetadataKey.DATE,
          value: dayjs(v.start_time, 'YYYYMMDDHHmm').tz('Asia/Tokyo').format('YYYY/MM/DD')
        },
        {
          key: RecordMetadataKey.START_DATETIME,
          value: dayjs(v.start_time, 'YYYYMMDDHHmm').tz('Asia/Tokyo').format('YYYY/MM/DD HH:mm:ss')
        },
        {
          key: RecordMetadataKey.TIME_LIMIT,
          value: v.time.toString()
        },
        {
          key: RecordMetadataKey.BLACK_TIME_LIMIT,
          value: v.time.toString()
        },
        {
          key: RecordMetadataKey.WHITE_TIME_LIMIT,
          value: v.time.toString()
        },
        {
          key: RecordMetadataKey.LENGTH,
          value: v.moves.toString()
        }
      ]
      if (v.tournament) {
        metadata.push({
          key: RecordMetadataKey.TOURNAMENT,
          value: v.tournament
        })
      }
      if (v.end_time) {
        metadata.push({
          key: RecordMetadataKey.END_DATETIME,
          value: dayjs(v.end_time, 'YYYYMMDDHHmm').tz('Asia/Tokyo').format('YYYY/MM/DD HH:mm:ss')
        })
      }
      if (v.location) {
        metadata.push({
          key: RecordMetadataKey.PLACE,
          value: v.location
        })
      }
      if (v.opening) {
        metadata.push({
          key: RecordMetadataKey.STRATEGY,
          value: v.opening
        })
      }
      return metadata
    })()
  }))

export const KIObjectSchema = BufferSchema.transform(decodeKI).pipe(KITransform)

export type KIObject = z.infer<typeof KIObjectSchema>

export const PlayerSchema = z
  .object({
    first_name: z.string(),
    last_name: z.string().nonempty(),
    rank: z.string()
  })
  .transform((v) => ({
    ...v,
    name: `${v.last_name} ${v.first_name}`,
    displayText: `${v.last_name} ${v.first_name} ${v.rank}`
  }))

export type Player = z.infer<typeof PlayerSchema>

/**
 * 対局情報
 */
export const SCSchema = KISchema.extend({
  type: z.literal(MessageTypeEnum.enum.SC),
  black: PlayerSchema,
  white: PlayerSchema
}).transform((v) => ({
  ...v,
  tournament: Object.values(Tournament).find((t) => v.title.includes(t))
}))
export type SC = z.infer<typeof SCSchema>

export const SCObjectSchema = BufferSchema.transform(decodeSC).pipe(SCSchema)

/**
 * 対局者情報
 */
export const BISchema = z
  .object({
    type: z.literal(MessageTypeEnum.enum.BI),
    length: z.number().int().min(0),
    is_black: z.boolean(),
    last_name: z.string().nonempty(),
    first_name: z.string()
  })
  .transform((v) => ({
    ...v,
    name: `${v.last_name} ${v.first_name}`,
    metadata: ((): { key: RecordMetadataKey; value: string }[] => {
      const metadata = [
        {
          key: v.is_black ? RecordMetadataKey.BLACK_NAME : RecordMetadataKey.WHITE_NAME,
          value: `${v.last_name} ${v.first_name}`
        }
      ]
      return metadata
    })()
  }))
export type BI = z.infer<typeof BISchema>

export const BIObjectSchema = BufferSchema.transform(decodeBI).pipe(BISchema)
export type BIObject = z.infer<typeof BIObjectSchema>

/**
 * 棋譜コメント情報
 */
export const KCSchema = z
  .object({
    type: z.literal(MessageTypeEnum.enum.KC),
    length: z.number().int().min(0),
    moves: z.number().int().min(0),
    consumed_time: z.number().int().min(0),
    position: z.object({
      prev: z.number().int().min(0),
      next: z.number().int().min(0)
    }),
    piece: z.number().int(),
    comment: z.string()
  })
  .transform((v) => ({
    ...v,
    csa: ((): string => {
      if (v.moves === 0) {
        return ['PI', '+'].join('\n')
      }
      if (v.piece === 0) {
        return ['%TORYO', v.comment.length === 0 ? [] : v.comment.split('\n').map((line) => `'*${line}`)]
          .flat()
          .join('\n')
      }
      const prefix: string = v.moves & 1 ? '+' : '-'
      const prev: string = v.position.prev.toString().padStart(2, '0')
      const next: string = v.position.next.toString().padStart(2, '0')
      return [
        `${prefix}${prev}${next}${PieceTypeEnum[v.piece]}`,
        `T${v.consumed_time}`,
        v.comment.length === 0 ? [] : v.comment.split('\n').map((line) => `'*${line}`)
      ]
        .flat()
        .join('\n')
    })()
  }))
export type KC = z.infer<typeof KCSchema>

export const KCObjectSchema = BufferSchema.transform(decodeKC).pipe(KCSchema)

/**
 * 不明
 */
export const CTSchema = z.object({
  type: z.literal(MessageTypeEnum.enum.CT)
})

const JSASchema = z
  .object({
    info: KIObjectSchema,
    black: BIObjectSchema,
    white: BIObjectSchema,
    comments: z.array(KCObjectSchema).nonempty()
  })
  .transform((v) => ({
    ...v,
    metadata: ((): { key: RecordMetadataKey; value: string }[] => {
      return v.info.metadata.concat([v.black.metadata, v.white.metadata].flat())
    })()
  }))
export type JSA = z.infer<typeof JSASchema>

export const JSAObjectSchema = BufferSchema.transform(decodeJSA).pipe(JSASchema)
export type JSAObject = z.infer<typeof JSASchema>
export type GameInfo = z.infer<typeof JSAObjectSchema>
