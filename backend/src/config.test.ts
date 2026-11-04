import { describe, expect, it } from 'vitest'
import { readConfig, readMailConfig } from './config.js'

describe('readConfig', () => {
  it('uses local defaults when the environment is empty', () => {
    expect(readConfig({})).toEqual({
      port: 3001,
      frontendOrigin: 'http://localhost:5173',
      fakeStoreBaseUrl: 'https://fakestoreapi.com',
      upstreamTimeoutMs: 8000,
    })
  })

  it('removes a trailing slash from the upstream base URL', () => {
    expect(
      readConfig({ FAKE_STORE_BASE_URL: 'https://catalogue.example/' }).fakeStoreBaseUrl,
    ).toBe('https://catalogue.example')
  })

  it('rejects an upstream URL that is not http or https', () => {
    expect(() => readConfig({ FAKE_STORE_BASE_URL: 'ftp://catalogue.example' })).toThrow(
      /FAKE_STORE_BASE_URL/,
    )
  })
})

describe('readMailConfig', () => {
  const env = {
    SMTP_HOST: 'localhost',
    SMTP_PORT: '1025',
    SMTP_SECURE: 'false',
    SMTP_USER: '',
    SMTP_PASS: '',
    MAIL_FROM: 'catalogue@mailbox.test',
    SALES_EMAIL: 'sales@mailbox.test',
  }

  it('reads SMTP settings without requiring a login', () => {
    expect(readMailConfig(env)).toEqual({
      host: 'localhost',
      port: 1025,
      secure: false,
      fromAddress: 'catalogue@mailbox.test',
      salesEmail: 'sales@mailbox.test',
    })
  })

  it('accepts a local Mailpit address', () => {
    expect(
      readMailConfig({
        ...env,
        MAIL_FROM: 'catalogue@localhost',
        SALES_EMAIL: 'sales@localhost',
      }).salesEmail,
    ).toBe('sales@localhost')
  })

  it('requires both SMTP login values together', () => {
    expect(() => readMailConfig({ ...env, SMTP_USER: 'mailbox-user', SMTP_PASS: '' })).toThrow(
      /SMTP_USER and SMTP_PASS/,
    )
  })

  it('requires the sales inbox address', () => {
    expect(() => readMailConfig({ ...env, SALES_EMAIL: '' })).toThrow(/SALES_EMAIL/)
  })
})
