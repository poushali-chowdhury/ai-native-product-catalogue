export class AppError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly fields?: Record<string, string>

  constructor(
    statusCode: number,
    code: string,
    message: string,
    fields?: Record<string, string>,
  ) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.fields = fields
  }
}

export const upstreamMessages = {
  unavailable: 'Products are temporarily unavailable. Please try again.',
  timeout: 'The product catalogue took too long to respond. Please try again.',
} as const

export function upstreamUnavailable(): AppError {
  return new AppError(502, 'UPSTREAM_UNAVAILABLE', upstreamMessages.unavailable)
}

export function upstreamTimeout(): AppError {
  return new AppError(504, 'UPSTREAM_TIMEOUT', upstreamMessages.timeout)
}

export const emailDeliveryMessage =
  'We could not send your enquiry just now. Please try again.'

export function emailDeliveryFailed(): AppError {
  return new AppError(502, 'EMAIL_DELIVERY_FAILED', emailDeliveryMessage)
}
