export interface EnquiryFields {
  name: string
  email: string
  phone: string
  message: string
}

export function validateEnquiry(input: EnquiryFields): Record<string, string> {
  const errors: Record<string, string> = {}
  const name = input.name.trim()
  const email = input.email.trim()
  const message = input.message.trim()

  if (!name) {
    errors.name = 'Enter your name.'
  } else if (name.length > 80) {
    errors.name = 'Name must be 80 characters or fewer.'
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    errors.email = 'Enter a valid email address.'
  }

  if (!isValidPhone(input.phone)) {
    errors.phone = 'Enter a valid phone number.'
  }

  if (!message) {
    errors.message = 'Enter a message.'
  } else if (message.length > 1000) {
    errors.message = 'Message must be 1000 characters or fewer.'
  }

  return errors
}

function isValidPhone(value: string): boolean {
  const phone = value.trim()
  const digits = phone.replace(/\D/g, '')
  const plusCount = phone.split('+').length - 1
  const hasUnsupportedCharacter = phone.replace(/[\d\s()+-]/g, '') !== ''

  return (
    phone.length > 0 &&
    !hasUnsupportedCharacter &&
    digits.length >= 7 &&
    digits.length <= 15 &&
    plusCount <= 1 &&
    (plusCount === 0 || phone.startsWith('+'))
  )
}
