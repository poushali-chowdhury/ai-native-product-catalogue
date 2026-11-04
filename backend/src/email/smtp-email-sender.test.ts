import { describe, expect, it, vi } from 'vitest'
import { emailDeliveryMessage } from '../errors.js'
import type { EnquiryMessage } from './email-sender.js'
import { SmtpEmailSender } from './smtp-email-sender.js'

const message: EnquiryMessage = {
  customerName: 'Ada Lovelace',
  customerEmail: 'ada@example.com',
  customerPhone: '555-010-1234',
  message: 'Is this available?\nPlease reply.',
  product: {
    id: 4,
    title: 'Gold ring\nSpecial',
    category: 'jewelery',
    price: 20,
    description: 'A slim gold band',
  },
}

const mailConfig = {
  host: 'mail.example',
  port: 1025,
  secure: false,
  fromAddress: 'catalogue@mailbox.test',
  salesEmail: 'sales@mailbox.test',
}

describe('SmtpEmailSender', () => {
  it('sends the enquiry to the configured sales address', async () => {
    const sent: Array<Record<string, string>> = []
    const sender = new SmtpEmailSender(mailConfig, {
      async send(mail) {
        sent.push(mail)
        return { accepted: [mail.to], rejected: [] }
      },
    })

    await sender.sendEnquiry(message)

    expect(sent).toEqual([
      {
        from: 'catalogue@mailbox.test',
        to: 'sales@mailbox.test',
        replyTo: 'ada@example.com',
        subject: 'Product enquiry: Gold ring Special',
        text: [
          'New product enquiry',
          '',
          'Product: Gold ring',
          'Special',
          'Product id: 4',
          'Category: jewelery',
          'Price: 20',
          'Description: A slim gold band',
          '',
          'Customer: Ada Lovelace',
          'Email: ada@example.com',
          'Phone: 555-010-1234',
          '',
          'Message:',
          'Is this available?',
          'Please reply.',
        ].join('\n'),
      },
    ])
  })

  it('fails when the SMTP provider does not accept the sales recipient', async () => {
    const sender = new SmtpEmailSender(mailConfig, {
      async send() {
        return { accepted: [], rejected: ['sales@mailbox.test'] }
      },
    })

    await expect(sender.sendEnquiry(message)).rejects.toMatchObject({
      statusCode: 502,
      message: emailDeliveryMessage,
    })
  })

  it('hides provider details when sending fails', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})
    const sender = new SmtpEmailSender(
      { ...mailConfig, password: 'secret-password' },
      {
        async send() {
          throw new Error('connect ECONNREFUSED mail.example:1025 secret-password')
        },
      },
    )

    await expect(sender.sendEnquiry(message)).rejects.toMatchObject({
      message: emailDeliveryMessage,
    })
    await expect(sender.sendEnquiry(message)).rejects.not.toThrow(/secret-password|mail\.example/)
    errorLog.mockRestore()
  })
})
