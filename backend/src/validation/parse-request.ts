import type { EnquiryInput } from '../domain.js'
import { AppError } from '../errors.js'

const maxNameLength = 80
const maxEmailLength = 254
const maxMessageLength = 1000
const maxSearchLength = 100
const maxCategoryLength = 80

export function parseProductId(value: string | string[] | undefined): number {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Product id must be a positive whole number.',
    )
  }

  const id = Number(value)
  if (!Number.isSafeInteger(id)) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Product id must be a positive whole number.',
    )
  }

  return id
}

export function parseCategory(value: string | string[] | undefined): string {
  if (typeof value !== 'string') {
    throw new AppError(400, 'VALIDATION_ERROR', 'Choose a valid category.')
  }

  const category = value.trim()
  if (category.length < 1 || category.length > maxCategoryLength) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Choose a valid category.')
  }

  return category
}

export function parseSearchQuery(value: unknown): string {
  if (typeof value !== 'string') {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      value === undefined ? 'Enter a search term.' : 'Enter one search term.',
    )
  }

  const query = value.trim().replace(/\s+/g, ' ')
  if (!query) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Enter a search term.')
  }

  if (query.length > maxSearchLength) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Search terms must be 100 characters or fewer.',
    )
  }

  return query
}

export function parseEnquiry(body: unknown): EnquiryInput {
  if (!isRecord(body)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Enter the enquiry details.')
  }

  const fields: Record<string, string> = {}
  const productId = readProductId(body.productId)
  const name = readLimitedText(body.name, maxNameLength)
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const phone = readPhone(body.phone)
  const message = readLimitedText(body.message, maxMessageLength)

  if (productId === undefined) {
    fields.productId = 'Choose a product.'
  }

  if (name.status === 'missing') {
    fields.name = 'Enter your name.'
  } else if (name.status === 'too-long') {
    fields.name = `Name must be ${maxNameLength} characters or fewer.`
  }

  if (
    !email ||
    email.length > maxEmailLength ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    fields.email = 'Enter a valid email address.'
  }

  if (phone.status === 'invalid') {
    fields.phone = 'Enter a valid phone number.'
  }

  if (message.status === 'missing') {
    fields.message = 'Enter a message.'
  } else if (message.status === 'too-long') {
    fields.message = `Message must be ${maxMessageLength} characters or fewer.`
  }

  const fieldNames = Object.keys(fields)
  if (
    fieldNames.length > 0 ||
    productId === undefined ||
    name.status !== 'ok' ||
    phone.status !== 'ok' ||
    message.status !== 'ok'
  ) {
    const messages = Object.values(fields)
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      messages.length === 1
        ? messages[0]!
        : 'Check the enquiry details and try again.',
      fields,
    )
  }

  return {
    productId,
    name: name.value,
    email,
    phone: phone.value,
    message: message.value,
  }
}

function readProductId(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    return undefined
  }

  if (!Number.isSafeInteger(value)) {
    return undefined
  }

  return value
}

function readLimitedText(
  value: unknown,
  maxLength: number,
): { status: 'ok'; value: string } | { status: 'missing' | 'too-long' } {
  if (typeof value !== 'string') {
    return { status: 'missing' }
  }

  const text = value.trim()
  if (!text) {
    return { status: 'missing' }
  }

  if (text.length > maxLength) {
    return { status: 'too-long' }
  }

  return { status: 'ok', value: text }
}

function readPhone(
  value: unknown,
): { status: 'ok'; value: string } | { status: 'invalid' } {
  if (typeof value !== 'string') {
    return { status: 'invalid' }
  }

  const phone = value.trim()
  const digits = phone.replace(/\D/g, '')
  const plusCount = phone.split('+').length - 1
  const hasUnsupportedCharacter = phone.replace(/[\d\s()+-]/g, '') !== ''

  if (
    !phone ||
    hasUnsupportedCharacter ||
    digits.length < 7 ||
    digits.length > 15 ||
    plusCount > 1 ||
    (plusCount === 1 && !phone.startsWith('+'))
  ) {
    return { status: 'invalid' }
  }

  return { status: 'ok', value: phone }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
