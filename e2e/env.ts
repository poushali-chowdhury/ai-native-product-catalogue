function withoutTrailingSlash(value: string): string {
  return value.replace(/\/$/, '')
}

export const appBaseUrl = withoutTrailingSlash(
  process.env.E2E_BASE_URL ?? 'http://localhost:5173',
)

export const apiBaseUrl = withoutTrailingSlash(
  process.env.E2E_API_BASE_URL ?? 'http://localhost:3000',
)
