export interface AppConfig {
  port: number
  frontendOrigin: string
  fakeStoreBaseUrl: string
  upstreamTimeoutMs: number
}

export interface MailConfig {
  host: string
  port: number
  secure: boolean
  fromAddress: string
  salesEmail: string
  user?: string
  password?: string
}

const defaultFrontendOrigin = 'http://localhost:5173'
const defaultFakeStoreBaseUrl = 'https://fakestoreapi.com'
const defaultTimeoutMs = 8000

export function readConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: readPort(env.PORT),
    frontendOrigin: readOrigin(env.FRONTEND_ORIGIN),
    fakeStoreBaseUrl: readBaseUrl(env.FAKE_STORE_BASE_URL),
    upstreamTimeoutMs: readTimeout(env.UPSTREAM_TIMEOUT_MS),
  }
}

function readPort(value: string | undefined): number {
  if (value === undefined || value.trim() === '') {
    return 3001
  }

  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return 3001
  }

  return port
}

function readOrigin(value: string | undefined): string {
  const origin = value?.trim() || defaultFrontendOrigin
  if (/[\r\n]/.test(origin)) {
    return defaultFrontendOrigin
  }

  return origin
}

function readBaseUrl(value: string | undefined): string {
  const baseUrl = (value ?? defaultFakeStoreBaseUrl).trim().replace(/\/$/, '')
  let url: URL

  try {
    url = new URL(baseUrl)
  } catch {
    throw new Error('FAKE_STORE_BASE_URL must be an absolute http(s) URL')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('FAKE_STORE_BASE_URL must be an absolute http(s) URL')
  }

  return baseUrl
}

export function readMailConfig(env: NodeJS.ProcessEnv = process.env): MailConfig {
  const host = requiredValue(env.SMTP_HOST, 'SMTP_HOST')
  const port = readRequiredPort(env.SMTP_PORT, 'SMTP_PORT')
  const secure = readRequiredBoolean(env.SMTP_SECURE, 'SMTP_SECURE')
  const fromAddress = readEmailAddress(env.MAIL_FROM, 'MAIL_FROM')
  const salesEmail = readEmailAddress(env.SALES_EMAIL, 'SALES_EMAIL')
  const user = env.SMTP_USER?.trim() ?? ''
  const password = env.SMTP_PASS?.trim() ?? ''

  if ((user === '') !== (password === '')) {
    throw new Error('SMTP_USER and SMTP_PASS must both be set, or both be left empty')
  }

  return {
    host,
    port,
    secure,
    fromAddress,
    salesEmail,
    ...(user ? { user, password } : {}),
  }
}

function requiredValue(value: string | undefined, name: string): string {
  const trimmed = value?.trim() ?? ''
  if (!trimmed || /[\r\n]/.test(trimmed)) {
    throw new Error(`${name} is required`)
  }

  return trimmed
}

function readRequiredPort(value: string | undefined, name: string): number {
  const port = Number(requiredValue(value, name))
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be a port number`)
  }

  return port
}

function readRequiredBoolean(value: string | undefined, name: string): boolean {
  const normalized = requiredValue(value, name).toLowerCase()
  if (normalized === 'true') {
    return true
  }

  if (normalized === 'false') {
    return false
  }

  throw new Error(`${name} must be true or false`)
}

function readEmailAddress(value: string | undefined, name: string): string {
  const email = requiredValue(value, name)
  if (!/^[^\s@]+@[^\s@]+$/.test(email)) {
    throw new Error(`${name} must be an email address`)
  }

  return email
}

function readTimeout(value: string | undefined): number {
  if (value === undefined || value.trim() === '') {
    return defaultTimeoutMs
  }

  const timeout = Number(value)
  if (!Number.isFinite(timeout) || timeout < 1) {
    return defaultTimeoutMs
  }

  return timeout
}
