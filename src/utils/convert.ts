export const toHankaku = (str: string): string => {
  return str.replace(/[\uFF10-\uFF19]/g, (match) => String.fromCharCode(match.charCodeAt(0) - 0xfee0))
}

export const replaceAll = (str: string): string => {
  return (
    str
      .replace(/[\uFF10-\uFF19]/g, (match) => String.fromCharCode(match.charCodeAt(0) - 0xfee0))
      .replace(/[\uFF21-\uFF3A\uFF41-\uFF5A]/g, (match) => String.fromCharCode(match.charCodeAt(0) - 0xfee0))
      // 全角スペース(U+3000)→半角スペース(U+0020)
      .replace(/\u3000/g, '\u0020')
      // △(U+25B3)→☖(U+2616)、▲(U+25B2)→☗(U+2617)
      .replace(/\u25B3/g, '\u2616')
      .replace(/\u25B2/g, '\u2617')
  )
}
