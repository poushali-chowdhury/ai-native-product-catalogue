import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from './app.js'

const app = createApp({
  emailSender: {
    sendEnquiry: async () => {},
  },
})

describe('GET /api/health', () => {
  it('returns a successful health status', async () => {
    const response = await request(app).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toMatch(/application\/json/)
    expect(response.body).toEqual({ status: 'ok' })
  })
})
