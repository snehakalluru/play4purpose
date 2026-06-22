import { z } from 'zod'

export const scoreSchema = z.object({
  score: z.number().int().min(1).max(45),
  score_date: z.string().refine((d) => !Number.isNaN(Date.parse(d)), {
    message: 'Invalid date'
  })
})

export type ScoreInput = z.infer<typeof scoreSchema>
