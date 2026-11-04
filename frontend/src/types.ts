export interface ProductRating {
  value: number
  count: number
}

export interface Product {
  id: number
  title: string
  price: number
  description: string
  category: string
  imagePath: string
  rating: ProductRating
}

export interface EnquiryDetails {
  productId: number
  name: string
  email: string
  phone: string
  message: string
}
