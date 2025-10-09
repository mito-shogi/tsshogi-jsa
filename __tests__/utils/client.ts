import iconv from 'iconv-lite'

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
