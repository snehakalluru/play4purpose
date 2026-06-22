import { z } from 'zod'

export const scoreSchema = z.object({
  score: z.number().int().min(40).max(200, {
    message: 'Score must be between 40 and 200'
  }),
  played_date: z.string().refine((d) => !Number.isNaN(Date.parse(d)), {
    message: 'Invalid date'
  }).refine((d) => {
    const date = new Date(d)
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    return date <= today
  }, { message: 'Future dates not allowed' })
})

export type ScoreInput = z.infer<typeof scoreSchema>
