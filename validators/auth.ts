import { z } from 'zod'

export const registrationSchema = z.object({
  full_name: z.string().trim().min(2, 'Full name is required.').max(128, 'Full name is too long.'),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128, 'Password is too long.'),
  phone: z.string().trim().min(7, 'Phone number is too short.').max(32, 'Phone number is too long.').optional().or(z.literal('')),
  privacy_accepted: z.literal(true, {
    errorMap: () => ({ message: 'Please accept the privacy policy.' })
  }),
  terms_accepted: z.literal(true, {
    errorMap: () => ({ message: 'Please accept the terms and conditions.' })
  })
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})

export type RegistrationInput = z.infer<typeof registrationSchema>
export type LoginInput = z.infer<typeof loginSchema>
