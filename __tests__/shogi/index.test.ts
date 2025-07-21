import { describe, expect, test } from 'bun:test'
import { doesNotThrow } from 'node:assert'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'bun'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { exportKIF, type Record } from 'tsshogi'
import { JSAObjectSchema } from '../../src/models/message.dto'
import { importJSA } from '../../src/utils/jsa'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)
dayjs.tz.setDefault('Asia/Tokyo')

const readFile = (file: string | number): Buffer => {
  return readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'bin', `${file}.bin`))
}

describe('[Suceess] Parse', () => {
  const game_id_list: number[] = [
    99, 100, 798, 4312, 4567, 17344, 17346, 17347, 17355, 17356, 17357, 17358, 17359, 17361, 17362, 17364, 17365, 17367,
    17368, 100
  ]
  for (const game_id of game_id_list) {
    test(`Parse ${game_id}`, () => {
      const buffer: Buffer = readFile(game_id)
      const result = JSAObjectSchema.safeParse(buffer)
      if (!result.success) {
        console.error(result.error)
        throw new Error(`Failed to parse JSA for game_id ${game_id}`)
      }
      expect(result.data.info.game_id).toBe(game_id)
      doesNotThrow(() => importJSA(buffer))
      const record: Record | Error = importJSA(buffer)
      if (record instanceof Error) {
        throw record
      }
      console.log(exportKIF(record))
    })
  }
})

describe('[Failure] Parse', () => {
  const game_id_list: number[] = [99999, 999999]
  for (const game_id of game_id_list) {
    test(`Parse ${game_id}`, () => {
      const buffer: Buffer = readFile(game_id)
      expect(() => importJSA(buffer)).toThrow()
    })
  }
})
