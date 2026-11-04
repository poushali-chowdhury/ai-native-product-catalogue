import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from './app.js'
import type { ProviderProduct } from './domain.js'
import type { EmailSender, EnquiryMessage } from './email/email-sender.js'
import { emailDeliveryMessage, upstreamMessages } from './errors.js'
import { FakeStoreProductProvider } from './providers/fake-store-provider.js'
import type { ProductProvider } from './providers/product-provider.js'

const products: ProviderProduct[] = [
  {
    id: 1,
    title: 'Silver pack',
    price: 15,
    description: 'A small day pack',
    category: "men's clothing",
    rating: { value: 3, count: 10 },
  },
  {
    id: 2,
    title: 'Gold ring',
    price: 25,
    description: 'A slim gold band',
    category: 'jewelery',
    rating: { value: 4.9, count: 40 },
  },
  {
    id: 3,
    title: 'Headphones',
    price: 60,
    description: 'Wireless audio',
    category: 'electronics',
    rating: { value: 4.2, count: 80 },
  },
  {
    id: 4,
    title: 'Coat',
    price: 80,
    description: 'Warm wool coat',
    category: "women's clothing",
    rating: { value: 4.5, count: 20 },
  },
  {
    id: 5,
    title: 'Bracelet',
    price: 30,
    description: 'A chain bracelet',
    category: 'jewelery',
    rating: { value: 4, count: 12 },
  },
  {
    id: 6,
    title: 'Keyboard',
    price: 45,
    description: 'Compact keyboard',
    category: 'electronics',
    rating: { value: 3.5, count: 8 },
  },
]

function catalogue(overrides: Partial<ProductProvider> = {}): ProductProvider {
  return {
    getAll: async () => products,
    getById: async (id) => products.find((product) => product.id === id) ?? null,
    getCategories: async () => ['jewelery', "men's clothing", 'electronics'],
    getByCategory: async (category) => {
      const known = ['jewelery', "men's clothing", 'electronics', "women's clothing"]
      if (!known.some((item) => item.toLocaleLowerCase() === category.toLocaleLowerCase())) {
        return null
      }

      return products.filter(
        (product) => product.category.toLocaleLowerCase() === category.toLocaleLowerCase(),
      )
    },
    getImage: async (id) =>
      id === 1
        ? { contentType: 'image/png', data: Uint8Array.from([9, 8, 7]) }
        : null,
    ...overrides,
  }
}

const acceptingEmail: EmailSender = {
  async sendEnquiry() {},
}

function app(
  overrides: Partial<ProductProvider> = {},
  emailSender: EmailSender = acceptingEmail,
) {
  return createApp({ productProvider: catalogue(overrides), emailSender })
}

describe('catalogue API', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns every product with a local image path', async () => {
    const response = await request(app()).get('/api/products')

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(6)
    expect(response.body.data[0].imagePath).toBe('/api/products/1/image')
    expect(JSON.stringify(response.body)).not.toContain('fakestoreapi.com')
  })

  it('returns the five highest rated products', async () => {
    const response = await request(app()).get('/api/products/featured')

    expect(response.status).toBe(200)
    expect(response.body.data.map((product: { id: number }) => product.id)).toEqual([
      2, 4, 3, 5, 6,
    ])
  })

  it('returns categories in display order', async () => {
    const response = await request(app()).get('/api/products/categories')

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual(['electronics', 'jewelery', "men's clothing"])
  })

  it('returns products in a category', async () => {
    const response = await request(app()).get(
      `/api/products/category/${encodeURIComponent("men's clothing")}`,
    )

    expect(response.status).toBe(200)
    expect(response.body.data.map((product: { id: number }) => product.id)).toEqual([1])
  })

  it('returns a not-found response for an unknown category', async () => {
    const response = await request(app()).get('/api/products/category/tools')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'That category was not found.',
      },
    })
  })

  it('searches titles and descriptions', async () => {
    const response = await request(app()).get('/api/products/search').query({ q: 'GOLD' })

    expect(response.status).toBe(200)
    expect(response.body.data.map((product: { id: number }) => product.id)).toEqual([2])
  })

  it('asks for a search term when the query is blank', async () => {
    const response = await request(app()).get('/api/products/search')

    expect(response.status).toBe(400)
    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Enter a search term.',
    })
  })

  it('returns one product', async () => {
    const response = await request(app()).get('/api/products/2')

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      id: 2,
      title: 'Gold ring',
      imagePath: '/api/products/2/image',
    })
  })

  it('rejects an invalid product id before asking the provider', async () => {
    const getById = vi.fn(async () => null)
    const response = await request(app({ getById })).get('/api/products/abc')

    expect(response.status).toBe(400)
    expect(response.body.error.message).toBe('Product id must be a positive whole number.')
    expect(getById).not.toHaveBeenCalled()
  })

  it('returns a not-found response when the product does not exist', async () => {
    const response = await request(app()).get('/api/products/99')

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('NOT_FOUND')
  })

  it('serves a product image from this API', async () => {
    const response = await request(app()).get('/api/products/1/image')

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toMatch(/image\/png/)
    expect(response.body).toEqual(Buffer.from([9, 8, 7]))
  })

  it('hides the upstream address when the provider fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = await request(
      app({
        getAll: async () => {
          throw new Error('failed while calling https://fakestoreapi.com/products')
        },
      }),
    ).get('/api/products')

    expect(response.status).toBe(500)
    expect(response.body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again.',
      },
    })
    expect(JSON.stringify(response.body)).not.toContain('fakestoreapi.com')
  })

  it('passes a provider error message through for the client to display', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = await request(
      createApp({
        emailSender: acceptingEmail,
        productProvider: new FakeStoreProductProvider({
          baseUrl: 'https://fakestoreapi.com',
          timeoutMs: 1000,
          cacheTtlMs: 0,
          fetch: async () => new Response('nope', { status: 503 }),
        }),
      }),
    ).get('/api/products')

    expect(response.status).toBe(502)
    expect(response.body.error).toEqual({
      code: 'UPSTREAM_UNAVAILABLE',
      message: upstreamMessages.unavailable,
    })
    expect(JSON.stringify(response.body)).not.toContain('fakestoreapi.com')
    expect(errorLog).not.toHaveBeenCalled()
  })

  it('accepts an enquiry and keeps the product title from the catalogue', async () => {
    const sent: EnquiryMessage[] = []
    const response = await request(
      app(undefined, {
        async sendEnquiry(message) {
          sent.push(message)
        },
      }),
    )
      .post('/api/enquiries')
      .send({
        productId: 2,
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        phone: '555-010-1234',
        message: 'Is this available?',
        productTitle: 'Wrong title',
      })

    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({
      productId: 2,
      productTitle: 'Gold ring',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '555-010-1234',
      message: 'Is this available?',
    })
    expect(response.body.data.id).toEqual(expect.any(String))
    expect(sent).toEqual([
      {
        customerName: 'Ada Lovelace',
        customerEmail: 'ada@example.com',
        customerPhone: '555-010-1234',
        message: 'Is this available?',
        product: {
          id: 2,
          title: 'Gold ring',
          category: 'jewelery',
          price: 25,
          description: 'A slim gold band',
        },
      },
    ])
  })

  it('returns an error when the email provider does not accept the enquiry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = await request(
      app(undefined, {
        async sendEnquiry() {
          throw new Error('SMTP password secret-password was rejected by mail.example')
        },
      }),
    )
      .post('/api/enquiries')
      .send({
        productId: 2,
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        phone: '555-010-1234',
        message: 'Is this available?',
      })

    expect(response.status).toBe(502)
    expect(response.body.error).toEqual({
      code: 'EMAIL_DELIVERY_FAILED',
      message: emailDeliveryMessage,
    })
    expect(JSON.stringify(response.body)).not.toContain('secret-password')
    expect(JSON.stringify(response.body)).not.toContain('mail.example')
  })

  it('returns field errors for an invalid enquiry', async () => {
    const response = await request(app()).post('/api/enquiries').send({
      productId: '2',
      name: '',
      email: 'ada',
      message: '',
    })

    expect(response.status).toBe(400)
    expect(response.body.error.fields).toEqual({
      productId: 'Choose a product.',
      name: 'Enter your name.',
      email: 'Enter a valid email address.',
      message: 'Enter a message.',
      phone: 'Enter a valid phone number.',
    })
  })

  it('rejects an enquiry for a missing product', async () => {
    const response = await request(app()).post('/api/enquiries').send({
      productId: 99,
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '555-010-1234',
      message: 'Is this available?',
    })

    expect(response.status).toBe(404)
    expect(response.body.error.message).toBe('That product was not found.')
  })

  it('rejects a request body that is not JSON', async () => {
    const response = await request(app())
      .post('/api/enquiries')
      .set('Content-Type', 'application/json')
      .send('{')

    expect(response.status).toBe(400)
    expect(response.body.error.message).toBe('The request body must be valid JSON.')
  })

  it('returns JSON for an unknown route', async () => {
    const response = await request(app()).get('/api/does-not-exist')

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('NOT_FOUND')
  })

  it('allows the configured frontend origin to call the API', async () => {
    const response = await request(app()).options('/api/products')

    expect(response.status).toBe(204)
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173')
    expect(response.headers['access-control-allow-methods']).toContain('GET')
    expect(response.headers['access-control-allow-methods']).toContain('POST')
  })
})
