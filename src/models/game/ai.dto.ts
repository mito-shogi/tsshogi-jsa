import dayjs from 'dayjs'
import iconv from 'iconv-lite'
import {
  InitialPositionType,
  type Move,
  PieceType,
  Position,
  Record,
  RecordMetadataKey,
  SpecialMoveType,
  Square
} from 'tsshogi'
import z from 'zod'
import { TournamentList } from '@/constant/tournament'
import { replaceAll } from '@/utils/convert'
import { BufferSchema } from '../buffer.dto'

export const KIFSchema = z.object({
  num: z.number(),
  time: z.number(),
  toX: z.union([z.number(), z.null()]),
  toY: z.union([z.number(), z.null()]),
  type: z.string(),
  frX: z.union([z.number(), z.null()]),
  frY: z.union([z.number(), z.null()]),
  prmt: z.union([z.number(), z.null()]),
  spend: z.number(),
  move: z.string(),
  _id: z.string()
})

const GameSchema = z.object({
  _id: z.string(),
  modified_at: z.coerce.date(),
  gametype: z.string(),
  key: z.string(),
  fname: z.string(),
  event: z.string(),
  player1: z.string(),
  player2: z.string(),
  side: z.string(),
  place: z.string(),
  starttime: z.string(),
  realstarttime: z.number(),
  // biome-ignore lint/suspicious/noExplicitAny: reason
  endtime: z.preprocess((input: any) => (input.length === 0 ? undefined : input), z.coerce.date().optional()),
  timelimit: z.string(),
  countdown: z.string(),
  spendtime_p1: z.string(),
  spendtime_p2: z.string(),
  delaytimes_p1: z.string(),
  delaytimes_p2: z.string(),
  delatetime_p1: z.string(),
  delatetime_p2: z.string(),
  lunchtime_start: z.string(),
  lunchtime_end: z.string(),
  dinnertime_start: z.string(),
  dinnertime_end: z.string(),
  stoptime_start: z.string(),
  stoptime_end: z.string(),
  recordman: z.string(),
  judgeside: z.string(),
  note: z.string(),
  end_tesu: z.number(),
  end_mark: z.string(),
  end_reason: z.string(),
  end_side: z.string(),
  __v: z.number(),
  dinnertime_end_2: z.string(),
  dinnertime_start_2: z.string(),
  handicap: z.string(),
  lunchtime_end_2: z.string(),
  lunchtime_start_2: z.string(),
  modified_by: z.string().optional(),
  enddate: z.string().optional(),
  kif: z.array(KIFSchema)
  // breaktime: z.array(z.any())
})

export const importBJF = (buffer: Buffer): Record => {
  const game = BufferSchema.transform((v) => JSON.parse(replaceAll(iconv.decode(v, 'utf-8'))))
    .pipe(GameSchema.array().transform((v) => v[0]))
    .parse(buffer)
  const position: Position = (() => {
    if (game.handicap === '平手') {
      // biome-ignore lint/style/noNonNullAssertion: ignore
      return Position.newBySFEN(InitialPositionType.STANDARD)!
    }
    throw new Error('Not implemented')
  })()
  const record: Record = new Record(position)
  for (const kif of game.kif) {
    // 多分これになるのは投了のときだけ
    if (kif.toX === null || kif.toY === null) {
      if (kif.move === '投了') {
        record.append(SpecialMoveType.RESIGN)
        continue
      }
      if (kif.move === '千日手') {
        record.append(SpecialMoveType.REPETITION_DRAW)
        continue
      }
      if (kif.move === '不明') {
        record.append(SpecialMoveType.IMPASS)
        continue
      }
      throw new Error(`Invalid SpecialMoveType ${kif.move}`)
    }
    if (kif.frX === null || kif.frY === null) {
      continue
    }
    const to: Square = new Square(kif.toX, kif.toY)
    const from: Square | PieceType = (() => {
      if (kif.frY === 0 || kif.frY >= 10) {
        switch (kif.type) {
          case 'KYO':
            return PieceType.LANCE
          case 'KEI':
            return PieceType.KNIGHT
          case 'GIN':
            return PieceType.SILVER
          case 'KIN':
            return PieceType.GOLD
          case 'KAKU':
            return PieceType.BISHOP
          case 'HI':
            return PieceType.ROOK
          case 'FU':
            return PieceType.PAWN
          default:
            throw new Error(`Unknown piece type: ${kif.type}`)
        }
      }
      return new Square(kif.frX, kif.frY)
    })()
    const move: Move | null = record.position.createMove(from, to)
    if (move === null) {
      console.error(kif)
      throw new Error(`Invalid move: from ${from} to ${to}`)
    }
    // 成り判定
    move.promote = kif.prmt === 1
    record.append(move, { ignoreValidation: false })
    // 消費時間を追加
    record.current.setElapsedMs(kif.spend * 1000)
  }
  const tournament = TournamentList.find((t) => t.keys.some((key) => game.event.includes(key)))?.value
  // const tournament = TournamentList.find((t) => t.keys.some(key) => game.title.includes(key))?.value)
  record.metadata.setStandardMetadata(RecordMetadataKey.TITLE, game.event)
  record.metadata.setStandardMetadata(RecordMetadataKey.DATE, dayjs(game.starttime).format('YYYY/MM/DD'))
  record.metadata.setStandardMetadata(
    RecordMetadataKey.START_DATETIME,
    dayjs(game.starttime).format('YYYY/MM/DD HH:mm:ss')
  )
  record.metadata.setStandardMetadata(RecordMetadataKey.TIME_LIMIT, game.timelimit)
  record.metadata.setStandardMetadata(RecordMetadataKey.BLACK_TIME_LIMIT, game.timelimit)
  record.metadata.setStandardMetadata(RecordMetadataKey.WHITE_TIME_LIMIT, game.timelimit)
  record.metadata.setStandardMetadata(RecordMetadataKey.LENGTH, (game.end_tesu - 1).toString())
  if (tournament !== undefined) {
    record.metadata.setStandardMetadata(RecordMetadataKey.TOURNAMENT, tournament)
  }
  record.metadata.setStandardMetadata(RecordMetadataKey.STRATEGY, '')
  if (game.endtime !== undefined) {
    record.metadata.setStandardMetadata(
      RecordMetadataKey.END_DATETIME,
      dayjs(game.endtime).format('YYYY/MM/DD HH:mm:ss')
    )
  }
  record.metadata.setStandardMetadata(RecordMetadataKey.PLACE, game.place)
  record.metadata.setStandardMetadata(RecordMetadataKey.BLACK_NAME, game.player2)
  record.metadata.setStandardMetadata(RecordMetadataKey.WHITE_NAME, game.player1)
  return record
}

const BufferGameSchema = BufferSchema.transform((v) => replaceAll(iconv.decode(v, 'shift_jis')))
  .pipe(z.string().nonempty())
  .transform((v) => ({
    games: v
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .filter((line) => !line.startsWith('#'))
      .filter((line) => !Number.isNaN(Number.parseInt(line, 10)))
      .map((line) => ({
        game_id: Number.parseInt(line, 10)
      }))
  }))
  .transform((v) => ({
    ...v,
    count: v.games.length
  }))

/**
 * AI棋譜のリストを返します
 * @param buffer
 * @returns
 */
export const decodeBJFList = (buffer: Buffer): { games: { game_id: number }[]; count: number } => {
  const result = BufferGameSchema.safeParse(buffer)
  if (!result.success) {
    throw result.error
  }
  return result.data
}
