import { z } from 'zod'

export const charitySelectionSchema = z.object({
  charity_id: z.string().uuid(),
  contribution_percentage: z.number().int().min(10).max(100).optional()
})

export type CharitySelection = z.infer<typeof charitySelectionSchema>
