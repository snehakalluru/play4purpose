import { z } from 'zod'

export const registrationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  full_name: z.string().min(2).max(128).optional()
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})

export type RegistrationInput = z.infer<typeof registrationSchema>
export type LoginInput = z.infer<typeof loginSchema>
