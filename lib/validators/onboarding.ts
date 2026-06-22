import { z } from 'zod'

export const registerSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  avatar_url: z.string().url().optional().nullable()
})

export const acceptTermsSchema = z.object({
  terms_accepted: z.literal(true, { errorMap: () => ({ message: 'Terms must be accepted' }) })
})

export const charitySelectionSchema = z.object({
  charity_id: z.string().uuid(),
  contribution_percentage: z.union([
    z.literal(10),
    z.literal(15),
    z.literal(20),
    z.literal(25),
    z.literal(50)
  ])
})

export const subscriptionChoiceSchema = z.object({
  plan: z.enum(['monthly', 'yearly'])
})

export const handicapSchema = z.object({
  handicap: z.number().min(-10).max(54).optional().nullable()
})

export const scoreEntrySchema = z.object({
  score: z.number().int().min(1).max(45),
  score_date: z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: 'Invalid date' })
})

export const initialScoresSchema = z.array(scoreEntrySchema).max(5)

export type RegisterInput = z.infer<typeof registerSchema>
export type CharitySelectionInput = z.infer<typeof charitySelectionSchema>
export type ScoreEntryInput = z.infer<typeof scoreEntrySchema>
