import z from 'zod'

export const PlayerInfoSchema = z.object({
  first_name: z.string(),
  last_name: z.string().nonempty(),
  rank: z.string().nonempty().optional(),
  name: z.string().nonempty(),
  display_text: z.string().nonempty()
})

export const MetadataInfo = z.object({
  date: z.string().nonempty(),
  start_time: z.string().nonempty(),
  end_time: z.string().nonempty().nullable(),
  title: z.string().nonempty(),
  tournament: z.string().nonempty(),
  length: z.number().min(0),
  place: z.string().nonempty().optional(),
  strategy: z.string().nonempty().optional()
})

export const GameInfoListSchema = z.object({
  games: z.array(
    z.object({
      game_id: z.number().int(),
      meijin_id: z.number().int().optional(),
      key: z.string().optional(),
      black: PlayerInfoSchema,
      white: PlayerInfoSchema,
      metadata: MetadataInfo
    })
  ),
  count: z.number().int()
})

export type GameInfoList = z.infer<typeof GameInfoListSchema>
