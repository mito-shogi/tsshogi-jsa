import iconv from 'iconv-lite'
import z, { number, string } from 'zod'

export const fetch_jsam_game_list = async (params: { p1: number, p2: number, p3: number } = {
  p1: 0,
  p2: 200,
  p3: 2

}): Promise<Buffer> => {
  const url: URL = new URL("/api/index.php", "https://ip.jsamobile.jp")
  url.searchParams.set("action", "search")
  url.searchParams.set("p3", params.p3.toString())
  url.searchParams.set("p2", params.p2.toString())
  url.searchParams.set("p1", params.p1.toString())
  const response = await fetch(url.href, {
    headers: {
      'Authorization': `Basic ${btoa(`${process.env.JSAM_USERNAME}:${process.env.JSAM_PASSWORD}`)}`
    }
  })
  if (!response.ok) {
    throw new Error(response.statusText)
  }
  return Buffer.from(await response.arrayBuffer())
}

export const fetch_ai_game_list = async (): Promise<Buffer> => {
  const url: URL = new URL('/ai/ai_game_list.txt', 'https://d2pngvm764jm.cloudfront.net')
  const response = await fetch(url.href, {
    headers: {
      'Authorization': `Basic ${btoa(`${process.env.AI_USERNAME}:${process.env.AI_PASSWORD}`)}`
    }
  })
  if (!response.ok) {
    throw new Error(response.statusText)
  }
  return Buffer.from(await response.arrayBuffer())
}

export const fetch_igoshogi_game_list = async ({
  type,
  ki,
  block
}: {
  type: 'g' | 'L',
  ki: number,
  block: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'k' | 'K'
}): Promise<Buffer> => {
  const url: URL = new URL('/apis/kifu/readKekkaList.php', 'https://www.igoshogi.net')
  url.searchParams.set("type", type)
  url.searchParams.set("ki", ki.toString())
  url.searchParams.set("block", block)
  const response = await fetch(url.href)
  if (!response.ok) {
    throw new Error(response.statusText)
  }
  return Buffer.from(await response.arrayBuffer())
}

export const fetch_igoshogi_game = async ({
  key
}: {
  key: string
}): Promise<Buffer> => {
  const url: URL = new URL('/apis/kifu/readKifuData.php', 'https://www.igoshogi.net')
  url.searchParams.set("KIFU", key)
  const response = await fetch(url.href, {
    headers: {
      Referer: 'https://www.igoshogi.net/'
    }
  })
  if (!response.ok) {
    console.error(url.href)
    throw new Error(response.statusText)
  }
  return Buffer.from(await response.arrayBuffer())
}

export const fetch_ai_game = async ({ game_id}: { game_id: number}): Promise<Buffer> => {
  const url: URL = new URL(`/ai/${game_id}.json`, 'https://d2pngvm764jm.cloudfront.net')
  const response = await fetch(url.href, {
    headers: {
      'Authorization': `Basic ${btoa(`${process.env.AI_USERNAME}:${process.env.AI_PASSWORD}`)}`
    }
  })
  if (!response.ok) {
    console.error('Failed to fetch AI game:', game_id, response.status, response.statusText)
    throw new Error(response.statusText)
  }
  return Buffer.from(await response.arrayBuffer())
}

export const fetch_jsam_game = async ({ game_id }: { game_id: number }): Promise<Buffer> => {
  const url: URL = new URL("/api/index.php", "https://ip.jsamobile.jp")
  url.searchParams.set("action", "shogi")
  url.searchParams.set("p1", game_id.toString())
  const response = await fetch(url.href, {
    headers: {
      'Authorization': `Basic ${btoa(`${process.env.JSAM_USERNAME}:${process.env.JSAM_PASSWORD}`)}`
    }
  })
  if (!response.ok) {
    throw new Error(response.statusText)
  }
  return Buffer.from(await response.arrayBuffer())
}

export const fetch_meijin_game_list = async (): Promise<Buffer> => {
  const url: URL = new URL("/list/meijin_all_game_list.txt", "https://d31j6ipzjd5eeo.cloudfront.net")
  const response = await fetch(url.href, {
    headers: {
      'Authorization': `Basic ${btoa(`${process.env.MEIJIN_USERNAME}:${process.env.MEIJIN_PASSWORD}`)}`
    }
  })
  if (!response.ok) {
    throw new Error(response.statusText)
  }
  return Buffer.from(await response.arrayBuffer())
}

export const fetch_meijin_game = async (params: { key: string, game_id?: number }): Promise<Buffer> => {
  const { key } = params
  const url: URL = new URL(key, "https://member.meijinsen.jp")
  const response = await fetch(url.href, {
    headers: {
      'Cookie': `kisen_session=${process.env.MEIJIN_SESSION}`
    }
  })
  if (!response.ok) {
    throw new Error(response.statusText)
  }
  return Buffer.from(await response.arrayBuffer())
}
