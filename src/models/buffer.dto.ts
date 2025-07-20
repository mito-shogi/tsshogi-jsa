import z from 'zod'

export const BufferSchema = z.instanceof(Buffer)
