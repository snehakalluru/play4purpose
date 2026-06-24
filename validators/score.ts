import { z } from 'zod'

const scoreObjectSchema = z.object({
  score: z.number().int().min(40).max(200, {
    message: 'Score must be between 40 and 200'
  }),
  played_date: z.string().optional(),
  score_date: z.string().optional()
}).refine((data) => data.played_date || data.score_date, {
  message: 'Score date is required',
  path: ['score_date']
})

export const scoreSchema = z.preprocess((input) => {
  if (!input || typeof input !== 'object') return input
  const record = input as Record<string, unknown>
  return {
    ...record,
    score: record.score ?? record.score_value,
    played_date: record.played_date ?? record.score_date,
    score_date: record.score_date ?? record.played_date
  }
}, scoreObjectSchema)

export type ScoreInput = z.infer<typeof scoreObjectSchema>
