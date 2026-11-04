import nodemailer from 'nodemailer'
import type { MailConfig } from '../config.js'
import type { EnquiryMessage, EmailSender } from './email-sender.js'
import { emailDeliveryFailed } from '../errors.js'

interface OutboundMail {
  from: string
  to: string
  replyTo: string
  subject: string
  text: string
}

interface DeliveryResult {
  accepted: string[]
  rejected: string[]
}

interface MailTransport {
  send(mail: OutboundMail): Promise<DeliveryResult>
}

export class SmtpEmailSender implements EmailSender {
  private readonly transport: MailTransport

  constructor(private readonly config: MailConfig, transport?: MailTransport) {
    this.transport = transport ?? new NodemailerTransport(config)
  }

  async sendEnquiry(message: EnquiryMessage): Promise<void> {
    const mail: OutboundMail = {
      from: this.config.fromAddress,
      to: this.config.salesEmail,
      replyTo: message.customerEmail,
      subject: `Product enquiry: ${oneLine(message.product.title)}`,
      text: renderEnquiry(message),
    }

    try {
      const result = await this.transport.send(mail)
      const accepted = result.accepted.some(
        (address) => address.toLowerCase() === this.config.salesEmail.toLowerCase(),
      )

      if (!accepted) {
        throw emailDeliveryFailed()
      }
    } catch (error) {
      if (isDeliveryFailure(error)) {
        throw error
      }

      console.error(error)
      throw emailDeliveryFailed()
    }
  }
}

class NodemailerTransport implements MailTransport {
  private readonly transporter: ReturnType<typeof nodemailer.createTransport>

  constructor(config: MailConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 10_000,
      ...(config.user && config.password
        ? { auth: { user: config.user, pass: config.password } }
        : {}),
    })
  }

  async send(mail: OutboundMail): Promise<DeliveryResult> {
    const info = await this.transporter.sendMail(mail)

    return {
      accepted: addressList(info.accepted),
      rejected: addressList(info.rejected),
    }
  }
}

function renderEnquiry(message: EnquiryMessage): string {
  return [
    'New product enquiry',
    '',
    `Product: ${message.product.title}`,
    `Product id: ${message.product.id}`,
    `Category: ${message.product.category}`,
    `Price: ${message.product.price}`,
    `Description: ${message.product.description}`,
    '',
    `Customer: ${message.customerName}`,
    `Email: ${message.customerEmail}`,
    `Phone: ${message.customerPhone}`,
    '',
    'Message:',
    message.message,
  ].join('\n')
}

function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

function addressList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item) => {
    if (typeof item === 'string') {
      return item
    }

    if (isRecord(item) && typeof item.address === 'string') {
      return item.address
    }

    return String(item)
  })
}

function isDeliveryFailure(error: unknown): boolean {
  return isRecord(error) && error.code === 'EMAIL_DELIVERY_FAILED'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
