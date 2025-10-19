import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)
dayjs.tz.setDefault('Asia/Tokyo')

export const toHankaku = (str: string): string => {
  return str.replace(/[\uFF10-\uFF19]/g, (match) => String.fromCharCode(match.charCodeAt(0) - 0xfee0))
}

export const toNormalizeDate = (input: string): string => {
  const date = dayjs(input, [
    'YYYY/MM/DD HH:mm',
    'YYYY/MM/DD H:mm',
    'YYYY/MM/D HH:mm',
    'YYYY/M/DD/H:mm',
    'YYYY/MM/DD'
  ]).subtract(9, 'hours')
  const isValid = date.isValid()
  if (!isValid) {
    throw new Error(`Invalid date format: ${input}`)
  }
  return date.toISOString()
}

export const replaceAll = (str: string): string => {
  return (
    str
      .replace(/[\uFF08-\uFF19]/g, (match) => String.fromCharCode(match.charCodeAt(0) - 0xfee0))
      .replace(/[\uFF21-\uFF3A\uFF41-\uFF5A]/g, (match) => String.fromCharCode(match.charCodeAt(0) - 0xfee0))
      // 全角スペース(U+3000)→半角スペース(U+0020)
      .replace(/\u3000/g, '\u0020')
      // △(U+25B3)→☖(U+2616)、▲(U+25B2)→☗(U+2617)
      .replace(/\u25B3/g, '\u2616')
      .replace(/\u25B2/g, '\u2617')
      .replace(/\uFF5E/g, '\u007E')
      .replace(/\u30FB/g, '\uFF65')
  )
}
