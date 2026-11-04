import type { Enquiry, EnquiryInput } from '../domain.js'
import type { EmailSender } from '../email/email-sender.js'
import type { EnquiryRepository } from '../enquiries/enquiry-repository.js'
import { AppError, emailDeliveryFailed } from '../errors.js'
import type { ProductProvider } from '../providers/product-provider.js'

export class EnquiryService {
  constructor(
    private readonly products: ProductProvider,
    private readonly enquiries: EnquiryRepository,
    private readonly email: EmailSender,
    private readonly now: () => Date = () => new Date(),
    private readonly createId: () => string = () => crypto.randomUUID(),
  ) {}

  async submit(input: EnquiryInput): Promise<Enquiry> {
    const product = await this.products.getById(input.productId)
    if (!product) {
      throw new AppError(404, 'NOT_FOUND', 'That product was not found.')
    }

    try {
      await this.email.sendEnquiry({
        customerName: input.name,
        customerEmail: input.email,
        customerPhone: input.phone,
        message: input.message,
        product: {
          id: product.id,
          title: product.title,
          category: product.category,
          price: product.price,
          description: product.description,
        },
      })
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }

      console.error(error)
      throw emailDeliveryFailed()
    }

    return this.enquiries.add({
      id: this.createId(),
      productId: product.id,
      productTitle: product.title,
      name: input.name,
      email: input.email,
      phone: input.phone,
      message: input.message,
      createdAt: this.now().toISOString(),
    })
  }
}
