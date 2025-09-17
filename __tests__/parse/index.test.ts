import { describe } from 'bun:test'
import { doesNotThrow } from 'node:assert'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'bun'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import timezone from 'dayjs/plugin/timezone'
import { decodeJSA } from '../../src/utils/jsa'

dayjs.extend(timezone)
dayjs.extend(customParseFormat)
dayjs.tz.setDefault('Asia/Tokyo')

const readFile = (file: string | number): Buffer => {
  return readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'bin', `${file}.bin`))
}

describe('[Success] Tournament', () => {
  const game_id: number = 19267
  const buffer: Buffer = readFile(game_id)
  doesNotThrow(() => decodeJSA(buffer))
  // doesNotThrow(() => importJSA(buffer))
})
