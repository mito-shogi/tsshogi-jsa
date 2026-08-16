import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import iconv from 'iconv-lite'
import { MessageTypeEnum } from '@/constant/message_type'
import { replaceAll, toHankaku } from './convert'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)
dayjs.tz.setDefault('Asia/Tokyo')

/**
 * バッファを `lengths` の並びで区切り、インデックスで引くアクセサを返す。
 *
 * 添字アクセスを関数に閉じ込めることで、`lengths` の定義と参照がずれた場合に
 * `undefined` が静かに伝播せず、その場で RangeError になる。
 */
const chunk = (data: Buffer, lengths: number[]): ((index: number) => Buffer) => {
  let offset = 0
  const chunks = lengths.map((length) => {
    const bytes = data.slice(offset, offset + length)
    offset += length
    if (bytes.length < length) {
      const padded = Buffer.alloc(length)
      bytes.copy(padded)
      return padded
    }
    return bytes
  })
  return (index: number): Buffer => {
    const bytes = chunks[index]
    if (bytes === undefined) {
      throw new RangeError(`chunk index ${index} is out of range (${chunks.length} chunks)`)
    }
    return bytes
  }
}

/**
 * `value.split(separator)[0]` と同じ結果を、添字アクセスなしで得る。
 */
const head = (value: string, separator: string): string => {
  const index = value.indexOf(separator)
  return index === -1 ? value : value.slice(0, index)
}

/**
 * - 0x04 区切り
 * - 0x04 長さ
 * - 0x04 対局ID
 * - 0x0C 開始日時
 * - 0x0C 終了日時
 * - 0x01 タイトルの長さ
 * - 0xXX タイトル
 * - 0x01 戦型の長さ
 * - 0xXX 戦型
 * - 0x01 不明
 * - 0x01 不明
 * - 0x02 持ち時間
 * - 0x01 開催地の長さ
 * - 0xXX 開催地
 * - 0x08 手数
 * - 0x02 区切り?
 * - 0x01 不明
 *
 * @param buffer
 * @returns
 */
export const decodeKI = (buffer: Buffer) => {
  // 初期値のオフセット
  const index: number = buffer.indexOf(Buffer.from([0x4b, 0x49]))
  const title_length: number = buffer.readUInt8(index + 0x22)
  const opening_length: number = buffer.readUInt8(index + 0x23 + title_length)
  const location_length: number = buffer.readUInt8(index + 0x28 + title_length + opening_length)
  // KIの区切り型
  const lengths = [
    0x02, // 区切り
    0x02, // 長さ
    0x04, // 対局ID
    0x0c, // 開始日時
    0x0c, // 終了日時
    0x01, // タイトルの長さ
    title_length, // タイトル
    0x01, // 戦型の長さ
    opening_length, // 戦型
    0x01, // 不明
    0x01, // 不明
    0x02, // 持ち時間
    0x01, // 開催地の長さ
    location_length, // 開催地
    0x04, // 手数
    0x02, // 区切り?
    0x01, // 不明
  ]
  // 区切ったバッファ
  const bytes = chunk(buffer.slice(index + 2), lengths)
  // バッファの中を表示
  // bytes.map((byte) => console.debug(byte.length.toString(16).padStart(2, '0'), byte.toString('hex')))
  const moves = bytes(14).readUInt32BE(0)
  const end_time = iconv.decode(bytes(4), 'shift_jis')
  return {
    type: MessageTypeEnum.enum.KI,
    length: bytes(1).readUInt16BE(0),
    game_id: bytes(2).readUInt32BE(0),
    start_time: dayjs
      .tz(iconv.decode(bytes(3), 'shift_jis'), 'YYYYMMDDHHmm', 'Asia/Tokyo')
      .toISOString(),
    end_time:
      end_time === '000000000000'
        ? null
        : dayjs.tz(end_time, 'YYYYMMDDHHmm', 'Asia/Tokyo').toISOString(),
    title: head(replaceAll(iconv.decode(bytes(6), 'shift_jis')), '/').trim(),
    strategy: bytes(8).length === 0 ? undefined : toHankaku(iconv.decode(bytes(8), 'shift_jis')),
    place: bytes(13).length === 0 ? undefined : replaceAll(iconv.decode(bytes(13), 'shift_jis')),
    moves: moves === 0x400 ? 0 : moves,
    time: moves === 0x400 ? 0 : bytes(11).readUInt16BE(0),
  }
}

/**
 *
 * @param buffer
 * @returns
 */
export const decodeBI = (buffer: Buffer) => {
  const index: number = buffer.indexOf(Buffer.from([0x42, 0x49]))
  const last_name_length: number = buffer.readUInt8(index + 0x07)
  const first_name_length: number = buffer.readUInt8(index + 0x08 + last_name_length)
  // BIの区切り型
  const lengths = [0x02, 0x02, 0x01, 0x01, last_name_length, 0x01, first_name_length, 0x02]
  const bytes = chunk(buffer.slice(index + 2), lengths)
  // bytes.map((byte) => console.debug(byte.length.toString(16).padStart(2, '0'), byte.toString('hex')))

  return {
    type: MessageTypeEnum.enum.BI,
    length: bytes(1).readUInt16BE(0),
    is_black: bytes(2).readUInt8(0) === 0x01,
    last_name: iconv.decode(bytes(4), 'shift_jis'),
    first_name: iconv.decode(bytes(6), 'shift_jis'),
  }
}

/**
 * - 0x02 区切り
 * - 0x02 長さ
 * - 0x02 手数
 * - 0x01 駒の種類
 * - 0x02 移動前座標
 * - 0x02 移動後座標
 * - 0x04 不明
 * - 0x04 コメントの長さ
 * - 0xXX コメント
 * @param buffer
 * @returns
 */
export const decodeKC = (buffer: Buffer) => {
  const index: number = buffer.indexOf(Buffer.from([0x4b, 0x43]))
  const length: number = buffer.readUInt32BE(index + 0x0f)
  // KCの区切り型
  const lengths = [0x02, 0x02, 0x02, 0x01, 0x01, 0x01, 0x04, 0x04, length]
  const bytes = chunk(buffer.slice(index + 2), lengths)
  // console.debug('Length:', buffer.length)
  // console.debug('Hex:', buffer.toHex())
  // console.debug('Text:', iconv.decode(bytes[8], 'shift_jis'))
  // bytes.map((byte) => console.debug(byte.length.toString(16).padStart(2, '0'), byte.toString('hex')))
  // console.debug('---------------')
  const next: number = bytes(5).readUInt8(0)
  const piece: number = bytes(3).readUInt8(0)
  return {
    type: MessageTypeEnum.enum.KC,
    length: bytes(1).readUInt16BE(0),
    moves: bytes(2).readUInt16BE(0),
    consumed_time: bytes(6).readUInt32BE(0),
    position: {
      prev: bytes(4).readUInt8(0),
      next: next > 0x80 ? next - 0x80 : next,
    },
    piece: next > 0x80 ? piece + 0x08 : piece,
    comment: replaceAll(iconv.decode(bytes(8), 'shift_jis')),
  }
}

export const decodeSC = (buffer: Buffer) => {
  try {
    // 初期値のオフセット
    const index: number = buffer.indexOf(Buffer.from([0x4b, 0x49]))
    const title_length: number = buffer.readUInt8(index + 0x22)
    const opening_length: number = buffer.readUInt8(index + 0x23 + title_length)
    // opening_length が 0 または 1 のレコードには戦型のデータバイトが無い
    const opening_data_length: number =
      opening_length === 1 || opening_length === 0 ? 0 : opening_length
    const black_index: number = index + 0x28 + title_length + opening_data_length
    const black_last_name_length: number = buffer.readUInt8(black_index)
    const black_first_name_length: number = buffer.readUInt8(
      black_index + 0x01 + black_last_name_length,
    )
    const black_rank_length: number = buffer.readUInt8(
      black_index + 0x02 + black_first_name_length + black_last_name_length,
    )
    const white_index: number =
      black_index + 0x03 + black_first_name_length + black_last_name_length + black_rank_length
    const white_last_name_length: number = buffer.readUInt8(white_index)
    const white_first_name_length: number = buffer.readUInt8(
      white_index + 0x01 + white_last_name_length,
    )
    const white_rank_length: number = buffer.readUInt8(
      white_index + 0x02 + white_first_name_length + white_last_name_length,
    )
    // SCの区切り型
    const lengths = [
      0x02, // 区切り
      0x02, // 長さ
      0x04, // 対局ID
      0x0c, // 開始日時
      0x0c, // 終了日時
      0x01, // タイトルの長さ
      title_length, // タイトル
      0x01, // 戦型の長さ
      // 戦型。長さフィールドと同じ解釈で切らないと、以降のフィールドが
      // 1 バイトずれて対局者名に制御文字が混入する
      opening_data_length,
      0x01, // 不明
      0x01, // 不明
      0x02, // 持ち時間
      0x01, // 先手名字の長さ
      black_last_name_length,
      0x01, // 先手名前の長さ
      black_first_name_length, // 先手名字
      0x01, // 先手段位の長さ
      black_rank_length, // 先手段位
      0x01, // 後手名字の長さ
      white_last_name_length,
      0x01, // 後手名前の長さ
      white_first_name_length, // 後手名字
      0x01, // 後手段位の長さ
      white_rank_length, // 後手段位
    ]
    // 区切ったバッファ
    const bytes = chunk(buffer.slice(index + 2), lengths)
    // バッファの中を表示
    // bytes.map((byte) =>
    //   console.debug(byte.length.toString(16).padStart(2, '0'), byte.toString('hex'), iconv.decode(byte, 'shift_jis'))
    // )
    // console.debug('---------------')
    const end_time = iconv.decode(bytes(4), 'shift_jis')
    return {
      type: MessageTypeEnum.enum.SC,
      length: bytes(1).readUInt16BE(0),
      game_id: bytes(2).readUInt32BE(0),
      start_time: dayjs
        .tz(iconv.decode(bytes(3), 'shift_jis'), 'YYYYMMDDHHmm', 'Asia/Tokyo')
        .toISOString(),
      end_time:
        end_time === '000000000000'
          ? null
          : dayjs.tz(end_time, 'YYYYMMDDHHmm', 'Asia/Tokyo').toISOString(),
      title: head(replaceAll(iconv.decode(bytes(6), 'shift_jis')), '/').trim(),
      moves: bytes(9).readUInt8(0),
      black: {
        last_name: iconv.decode(bytes(13), 'shift_jis'),
        first_name: iconv.decode(bytes(15), 'shift_jis'),
        rank: iconv.decode(bytes(17), 'shift_jis'),
      },
      white: {
        last_name: iconv.decode(bytes(19), 'shift_jis'),
        first_name: iconv.decode(bytes(21), 'shift_jis'),
        rank: iconv.decode(bytes(23), 'shift_jis'),
      },
    }
  } catch (error) {
    console.error('Failed to decode SC!')
    console.error('Hex:', buffer.toString('hex'))
    console.error('Text:', iconv.decode(buffer, 'shift_jis'))
    console.debug(`Decoding SC... Length: ${buffer.length} bytes`)
    // console.debug(buffer.toString('hex'), iconv.decode(buffer, 'shift_jis'))
    throw error
  }
}
