import { describe, expect, it } from 'vitest'
import { AppError } from '../errors.js'
import {
  parseCategory,
  parseEnquiry,
  parseProductId,
  parseSearchQuery,
} from './parse-request.js'

describe('request parsing', () => {
  it('accepts a positive whole-number product id', () => {
    expect(parseProductId('12')).toBe(12)
  })

  it('rejects product ids that are not positive whole numbers', () => {
    for (const value of ['0', '-3', '1.5', 'abc', '12abc']) {
      expect(() => parseProductId(value)).toThrow(AppError)
    }
  })

  it('trims a category name', () => {
    expect(parseCategory("  men's clothing  ")).toBe("men's clothing")
  })

  it('rejects an empty category', () => {
    expect(() => parseCategory('   ')).toThrow(AppError)
  })

  it('requires one search term', () => {
    expect(parseSearchQuery('  gold   ring ')).toBe('gold ring')
    expect(() => parseSearchQuery(undefined)).toThrow(/Enter a search term/)
    expect(() => parseSearchQuery(['gold', 'ring'])).toThrow(/Enter one search term/)
  })

  it('rejects a search term longer than 100 characters', () => {
    expect(() => parseSearchQuery('a'.repeat(101))).toThrow(/100 characters/)
  })

  it('returns a cleaned enquiry', () => {
    expect(
      parseEnquiry({
        productId: 4,
        name: '  Ada Lovelace  ',
        email: 'ada@example.com',
        phone: '  +1 (555) 010-1234  ',
        message: '  Is this available?  ',
        productTitle: 'Ignore me',
      }),
    ).toEqual({
      productId: 4,
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '+1 (555) 010-1234',
      message: 'Is this available?',
    })
  })

  it('reports every invalid enquiry field', () => {
    expect(() =>
      parseEnquiry({
        productId: '4',
        name: ' ',
        email: 'not-an-email',
        message: '',
      }),
    ).toThrow(AppError)

    try {
      parseEnquiry({
        productId: '4',
        name: ' ',
        email: 'not-an-email',
        message: '',
      })
    } catch (error) {
      expect(error).toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Check the enquiry details and try again.',
        fields: {
          productId: 'Choose a product.',
          name: 'Enter your name.',
          email: 'Enter a valid email address.',
          message: 'Enter a message.',
          phone: 'Enter a valid phone number.',
        },
      })
    }
  })

  it('uses the field message when only one enquiry field is invalid', () => {
    expect(() =>
      parseEnquiry({
        productId: 4,
        name: 'Ada',
        email: 'ada@example.com',
        phone: '555-010-1234',
        message: '   ',
      }),
    ).toThrow('Enter a message.')
  })
})
