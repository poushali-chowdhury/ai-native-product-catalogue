import type { Enquiry } from '../domain.js'

export interface EnquiryRepository {
  add(enquiry: Enquiry): Enquiry
}

export class InMemoryEnquiryRepository implements EnquiryRepository {
  private readonly items: Enquiry[] = []

  add(enquiry: Enquiry): Enquiry {
    const stored = { ...enquiry }
    this.items.push(stored)
    return { ...stored }
  }
}
