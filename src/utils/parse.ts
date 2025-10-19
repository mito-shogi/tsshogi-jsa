import { replaceAll } from './convert'

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
 * プレイヤー名から名前と段位を分離する関数
 */
export const parseName = (name: string): { name: string; rank?: string | undefined } => {
  const pattern =
    /^(?<player>.+?)(?<rank>(?:女流)?(?:初|[二三四五六七八九])段|女流(?:[一二]|[12])級|(?:女流)?[二三四五六七八]+冠|竜王名人|竜王・名人|(?:女流)?(?:名人|王位|王座|王将)|竜王|棋聖|棋王|叡王|倉敷藤花|白玲|清麗|女王|銀河)$/
  const match = name.match(pattern)

  if (!match) {
    throw new Error(`Invalid name format: ${name}`)
  }
  return {
    name: replaceAll(match.groups?.player.trim() ?? name),
    rank: match.groups?.rank.trim()
  }
}
