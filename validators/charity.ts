import { z } from 'zod'

export const charitySelectionSchema = z.object({
  charity_id: z.string().uuid()
})

export type CharitySelection = z.infer<typeof charitySelectionSchema>
