import { replaceAll } from './convert'
import { TITLES } from './rank_pattern'

/**
 * バッファーを区切り文字で分割する
 * @param buffer
 * @returns
 */
export const parse = (
  buffer: Buffer
): {
  metadata: Buffer
  black: Buffer
  white: Buffer
  comments: Buffer[]
} => {
  let index = 0
  const magic: Buffer = Buffer.from([0x42, 0x49])
  const black_index = buffer.indexOf(magic)
  const white_index = buffer.indexOf(magic, black_index + magic.length)
  const comments: Buffer[] = []
  const comment_buffer: Buffer = buffer.slice(white_index)
  // biome-ignore lint/suspicious/noAssignInExpressions: reason
  while ((index = comment_buffer.indexOf(Buffer.from([0x4b, 0x43]), index + 1)) !== -1) {
    const length: number = comment_buffer.readUInt32BE(index + 2)
    comments.push(comment_buffer.slice(index, index + length))
  }
  // console.debug(`Found ${comments.length} comments`)
  return {
    metadata: buffer,
    black: buffer.slice(black_index) as Buffer,
    white: buffer.slice(white_index) as Buffer,
    comments: comments
  }
}

/**
 * 算用数字を漢数字に変換する
 */
const _toKanjiNumber = (num: number): string => {
  const digits = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']
  const units = ['', '十', '百']

  if (num === 0) return ''
  if (num < 10) return digits[num]

  const str = num.toString()
  let result = ''

  for (let i = 0; i < str.length; i++) {
    const digit = Number.parseInt(str[i], 10)
    const unitIndex = str.length - i - 1

    if (digit === 0) continue

    if (unitIndex > 0 && digit === 1 && i === 0) {
      // 十、百の場合は「一」を省略
      result += units[unitIndex]
    } else {
      result += digits[digit]
      if (unitIndex > 0) result += units[unitIndex]
    }
  }

  return result
}

/**
 * 段位・タイトル文字列を正規化する
 * - 半角中点を全角中点に変換
 * - タイトルが2つ並んでいて中点がない場合に中点を挿入
 * - 括弧以降の余計な文字列を削除
 * - 算用数字を漢数字に変換（N世名人）
 */
const normalizeRank = (rank: string): string => {
  // 半角中点を全角中点に置換
  let normalized = rank.replace(/\u30FB/g, '\u30FB')

  // 括弧以降を削除（全角・半角両方）
  // \u3000: 全角スペース, \uFF08: 全角左括弧, \u0028: 半角左括弧
  normalized = normalized.replace(/[\s\u3000]*[\u0028\uFF08\uFF08].*$/, '')

  // 算用数字を漢数字に変換（N世名人のパターン）
  normalized = normalized.replace(/([0-9]+)世名人/g, (_match, num) => {
    return `${_toKanjiNumber(Number.parseInt(num, 10))}世名人`
  })

  // タイトル2つが中点なしで並んでいる場合に中点を挿入
  const titles = [
    '名人',
    '竜王',
    '王位',
    '王座',
    '王将',
    '棋聖',
    '棋王',
    '叡王',
    '銀河',
    '白玲',
    '清麗',
    '女王',
    '女流名人',
    '女流王位',
    '女流王座',
    '女流王将',
    '倉敷藤花',
    '永世竜王',
    '永世王将',
    '永世王位',
    '永世棋聖',
    '永世棋王',
    '永世叡王',
    '永世十段',
    '名誉王座'
  ]

  // 長いタイトルから順にチェック（短いタイトルが先にマッチするのを防ぐ）
  const sortedTitles = titles.sort((a, b) => b.length - a.length)

  for (const title1 of sortedTitles) {
    for (const title2 of sortedTitles) {
      if (title1 === title2) continue
      // タイトル2つが連続している場合、間に・を挿入
      const pattern = new RegExp(`(${title1})(${title2})`, 'g')
      normalized = normalized.replace(pattern, '$1\u30FB$2')
    }
  }

  return normalized.trim()
}

/**
 * プレイヤー名から名前と段位を分離する関数
 */
export const parseName = (name: string): { name: string; rank?: string | undefined } => {
  // 全パターンを結合して正規表現を作成
  const rankPattern = TITLES.map((r) => r.source).join('|')
  const pattern = new RegExp(`^(?<player>.+?)(?<rank>${rankPattern})$`)
  const match = name.match(pattern)

  if (!match) {
    throw new Error(`Invalid name format: ${name}`)
  }

  const rank = match.groups?.rank.trim()

  return {
    name: replaceAll(match.groups?.player.trim() ?? name),
    rank: rank ? normalizeRank(rank) : undefined
  }
}
