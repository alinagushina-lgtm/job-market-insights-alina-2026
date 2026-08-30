import { z } from "zod"

export const credentialsSchema = z.object({
  email: z.string().trim().email("Введите корректный email").max(254, "Email слишком длинный"),
  password: z.string().min(6, "Пароль должен содержать не менее 6 символов").max(128, "Пароль слишком длинный"),
})

export type Credentials = z.infer<typeof credentialsSchema>

export function parseCredentials(formData: FormData) {
  return credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })
}

export function authErrorMessage(code?: string) {
  if (code === "invalid_credentials") return "Неверный email или пароль"
  if (code === "user_already_exists" || code === "email_exists" || code === "user_already_registered") {
    return "Пользователь с таким email уже зарегистрирован"
  }
  if (code === "weak_password") return "Выберите более надёжный пароль"
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit") {
    return "Слишком много попыток. Подождите немного и повторите"
  }
  return "Сервис входа временно недоступен. Попробуйте ещё раз"
}
