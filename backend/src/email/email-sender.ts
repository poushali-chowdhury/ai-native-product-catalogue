export interface EnquiryMessage {
  customerName: string
  customerEmail: string
  customerPhone: string
  message: string
  product: {
    id: number
    title: string
    category: string
    price: number
    description: string
  }
}

/** Sends enquiry mail. Implementations own the provider-specific details. */
export interface EmailSender {
  sendEnquiry(message: EnquiryMessage): Promise<void>
}
