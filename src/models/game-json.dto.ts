import z from 'zod'

const KIFSchema = z.object({
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

/**
 * JSON形式の棋譜データ
 */
export const GameJSONSchema = z.object({
  _id: z.string().nonempty(),
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
  modified_by: z.string(),
  enddate: z.string(),
  kif: z.array(KIFSchema)
  // breaktime: z.array(z.any())
})
