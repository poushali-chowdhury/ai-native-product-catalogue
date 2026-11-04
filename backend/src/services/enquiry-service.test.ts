import { describe, expect, it } from 'vitest'
import type { Enquiry } from '../domain.js'
import type { EmailSender, EnquiryMessage } from '../email/email-sender.js'
import type { EnquiryRepository } from '../enquiries/enquiry-repository.js'
import { AppError, emailDeliveryFailed } from '../errors.js'
import type { ProductProvider } from '../providers/product-provider.js'
import { EnquiryService } from './enquiry-service.js'

function provider(): ProductProvider {
  return {
    getAll: async () => [],
    getById: async (id) =>
      id === 4
        ? {
            id: 4,
            title: 'Gold ring',
            price: 20,
            description: 'A slim gold band',
            category: 'jewelery',
            rating: { value: 4.5, count: 10 },
          }
        : null,
    getCategories: async () => [],
    getByCategory: async () => null,
    getImage: async () => null,
  }
}

function repository(): EnquiryRepository & { items: Enquiry[] } {
  const items: Enquiry[] = []

  return {
    items,
    add(enquiry) {
      items.push(enquiry)
      return { ...enquiry }
    },
  }
}

describe('EnquiryService', () => {
  const input = {
    productId: 4,
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '555-010-1234',
    message: 'Is this available?',
  }

  it('sends the enquiry email before storing it', async () => {
    const events: string[] = []
    const sent: EnquiryMessage[] = []
    const enquiries = repository()
    const email: EmailSender = {
      async sendEnquiry(message) {
        events.push('email')
        sent.push(message)
      },
    }
    const originalAdd = enquiries.add.bind(enquiries)
    enquiries.add = (enquiry) => {
      events.push('store')
      return originalAdd(enquiry)
    }
    const service = new EnquiryService(
      provider(),
      enquiries,
      email,
      () => new Date('2026-11-04T04:00:00.000Z'),
      () => 'enquiry-1',
    )

    await expect(service.submit(input)).resolves.toEqual({
      id: 'enquiry-1',
      productId: 4,
      productTitle: 'Gold ring',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '555-010-1234',
      message: 'Is this available?',
      createdAt: '2026-11-04T04:00:00.000Z',
    })
    expect(events).toEqual(['email', 'store'])
    expect(sent).toEqual([
      {
        customerName: 'Ada Lovelace',
        customerEmail: 'ada@example.com',
        customerPhone: '555-010-1234',
        message: 'Is this available?',
        product: {
          id: 4,
          title: 'Gold ring',
          category: 'jewelery',
          price: 20,
          description: 'A slim gold band',
        },
      },
    ])
  })

  it('does not store or email an enquiry for a missing product', async () => {
    let sent = 0
    const enquiries = repository()
    const service = new EnquiryService(provider(), enquiries, {
      async sendEnquiry() {
        sent += 1
      },
    })

    await expect(service.submit({ ...input, productId: 9 })).rejects.toBeInstanceOf(AppError)
    expect(sent).toBe(0)
    expect(enquiries.items).toEqual([])
  })

  it('does not store an enquiry when the email provider rejects it', async () => {
    const enquiries = repository()
    const service = new EnquiryService(provider(), enquiries, {
      async sendEnquiry() {
        throw emailDeliveryFailed()
      },
    })

    await expect(service.submit(input)).rejects.toMatchObject({
      statusCode: 502,
      code: 'EMAIL_DELIVERY_FAILED',
    })
    expect(enquiries.items).toEqual([])
  })
})
