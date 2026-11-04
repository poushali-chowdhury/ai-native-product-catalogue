export interface ProductRating {
  value: number
  count: number
}

/** Product data returned by a provider, with no upstream URLs. */
export interface ProviderProduct {
  id: number
  title: string
  price: number
  description: string
  category: string
  rating: ProductRating
}

/** Product sent to API clients. imagePath is a route on this backend. */
export interface Product extends ProviderProduct {
  imagePath: string
}

export interface ProductImage {
  contentType: string
  data: Uint8Array
}

export interface EnquiryInput {
  productId: number
  name: string
  email: string
  phone: string
  message: string
}

export interface Enquiry extends EnquiryInput {
  id: string
  productTitle: string
  createdAt: string
}
