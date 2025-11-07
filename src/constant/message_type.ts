import z from 'zod'

export enum MessageType {
  KI = 'KI',
  BI = 'BI',
  KC = 'KC',
  CT = 'CT',
  SC = 'SC'
}

export const MessageTypeEnum = z.enum(['KI', 'BI', 'KC', 'CT', 'SC'])
