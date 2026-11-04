import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { AppRoutes } from './App.tsx'
import type { Product } from './types.ts'

function product(
  id: number,
  title: string,
  rating: number,
  category = 'jewelery',
): Product {
  return {
    id,
    title,
    price: 100 + id,
    description: `${title} description`,
    category,
    imagePath: `/api/products/${id}/image`,
    rating: { value: rating, count: 10 },
  }
}

const featured = [
  product(1, 'Backpack', 3.9, "men's clothing"),
  product(2, 'Gold ring', 4.9),
  product(3, 'Headphones', 4.2, 'electronics'),
  product(4, 'Coat', 4.5, "women's clothing"),
  product(5, 'Keyboard', 3.5, 'electronics'),
]

const jewelery = [
  product(10, 'Silver band', 3),
  product(11, 'Gold ring', 4.9),
  product(12, 'Pearl studs', 4.2),
  product(13, 'Chain bracelet', 4.5),
]

const requests: Array<{ url: string; body?: string }> = []

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function installFetch() {
  requests.length = 0
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo, init?: RequestInit) => {
      const url = String(input)
      requests.push({ url, body: typeof init?.body === 'string' ? init.body : undefined })

      if (url.endsWith('/api/enquiries')) {
        return Promise.resolve(json({ data: { id: 'enquiry-1' } }, 201))
      }

      if (url.includes('/api/products/featured')) {
        return Promise.resolve(json({ data: featured }))
      }

      if (url.includes('/api/products/categories')) {
        return Promise.resolve(json({ data: ['electronics', 'jewelery'] }))
      }

      if (url.includes('/api/products/category/')) {
        return Promise.resolve(json({ data: jewelery }))
      }

      if (url.includes('/api/products/search')) {
        const query = new URL(url).searchParams.get('q')
        return Promise.resolve(json({ data: query === 'backpack' ? [featured[0]] : [] }))
      }

      if (url.includes('/api/products/1')) {
        return Promise.resolve(json({ data: featured[0] }))
      }

      return Promise.resolve(json({ error: { message: 'That resource was not found.' } }, 404))
    }),
  )
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

function titlesUnder(heading: string): string[] {
  const section = screen.getByRole('heading', { name: heading }).closest('section')
  if (!section) {
    throw new Error(`Missing section for ${heading}`)
  }

  return within(section)
    .getAllByRole('heading', { level: 3 })
    .map((item) => item.textContent ?? '')
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('product catalogue', () => {
  it('shows featured products, categories, and search from the home page', async () => {
    installFetch()
    renderAt('/')

    expect(await screen.findByRole('heading', { name: 'Keyboard', level: 3 })).toBeInTheDocument()
    expect(titlesUnder('Featured products')).toEqual([
      'Backpack',
      'Gold ring',
      'Headphones',
      'Coat',
      'Keyboard',
    ])
    expect(screen.getByRole('link', { name: 'Jewelery' })).toHaveAttribute(
      'href',
      '/category/jewelery',
    )
    expect(requests.every((request) => request.url.startsWith('http://localhost:3001/api/'))).toBe(
      true,
    )
    expect(requests.map((request) => request.url).join(' ')).not.toContain('fakestoreapi')

    fireEvent.change(screen.getByLabelText('Search products'), {
      target: { value: 'backpack' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByRole('heading', { name: 'Search results' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Featured products' })).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Backpack', level: 3 })).toBeInTheDocument()
  })

  it('shows an error and can try the featured products again', async () => {
    const attempts = { count: 0 }
    requests.length = 0
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo) => {
        const url = String(input)
        requests.push({ url })
        if (url.includes('/api/products/featured')) {
          attempts.count += 1
          if (attempts.count === 1) {
            return Promise.resolve(
              json(
                { error: { message: 'Products are temporarily unavailable. Please try again.' } },
                502,
              ),
            )
          }

          return Promise.resolve(json({ data: featured }))
        }

        return Promise.resolve(json({ data: ['electronics'] }))
      }),
    )
    renderAt('/')

    expect(
      await screen.findByText('Products are temporarily unavailable. Please try again.'),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Backpack', level: 3 })).toBeInTheDocument()
  })

  it('asks for a search term before searching', async () => {
    installFetch()
    renderAt('/')
    await screen.findByRole('heading', { name: 'Featured products' })

    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a search term.')
    expect(requests.some((request) => request.url.includes('/api/products/search'))).toBe(false)
  })

  it('shows a friendly message when a search has no matches', async () => {
    installFetch()
    renderAt('/search?q=missing')

    expect(
      await screen.findByText('No products match "missing". Try another search.'),
    ).toBeInTheDocument()
  })

  it('lists top-rated category products before the remaining products', async () => {
    installFetch()
    renderAt('/category/jewelery')

    expect(await screen.findByRole('heading', { name: 'Silver band', level: 3 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Jewelery' })).toBeInTheDocument()
    expect(titlesUnder('Top rated')).toEqual(['Gold ring', 'Chain bracelet', 'Pearl studs'])
    expect(titlesUnder('Remaining products')).toEqual(['Silver band'])
    expect(requests.some((request) => request.url.includes('/api/products/category/jewelery'))).toBe(
      true,
    )
  })

  it('shows product details from our API and accepts an enquiry', async () => {
    installFetch()
    renderAt('/products/1')

    expect(await screen.findByRole('heading', { name: 'Backpack' })).toBeInTheDocument()
    expect(screen.getByText('Backpack description')).toBeInTheDocument()
    expect(screen.getByText('$101.00')).toBeInTheDocument()
    expect(screen.getByText('3.9 out of 5, 10 reviews')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Backpack' })).toHaveAttribute(
      'src',
      'http://localhost:3001/api/products/1/image',
    )

    fireEvent.click(screen.getByRole('link', { name: 'Enquire' }))
    expect(await screen.findByRole('heading', { name: 'Enquire about Backpack' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(screen.getByText('Enter your name.')).toBeInTheDocument()
    expect(requests.some((request) => request.url.endsWith('/api/enquiries'))).toBe(false)

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ada Lovelace' } })
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'ada@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Phone number'), {
      target: { value: '555-010-1234' },
    })
    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Is this available?' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    expect(
      await screen.findByRole('heading', { name: 'Thank you for your enquiry!' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/We received your enquiry about Backpack/)).toBeInTheDocument()
    const enquiry = requests.find((request) => request.url.endsWith('/api/enquiries'))
    expect(JSON.parse(enquiry?.body ?? '{}')).toMatchObject({
      productId: 1,
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '555-010-1234',
      message: 'Is this available?',
    })
    expect(enquiry?.url).not.toContain('fakestoreapi')
  })
})
