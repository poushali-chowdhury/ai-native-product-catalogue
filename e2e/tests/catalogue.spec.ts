import { expect, type Locator, type Page, test } from '@playwright/test'
import { appBaseUrl } from '../env.ts'
import {
  formatCategory,
  formatPrice,
  formatRating,
  getData,
  getProducts,
  rankByRating,
  visibleTitle,
  type Product,
} from './catalogue.ts'

async function titlesIn(section: Locator): Promise<string[]> {
  const titles = await section.locator('h3').allInnerTexts()
  return titles.map((title) => title.trim())
}

async function sectionTitles(page: Page, heading: string): Promise<string[]> {
  const region = page.getByRole('region', { name: heading, exact: true })
  await expect(region).toBeVisible()
  return titlesIn(region)
}

async function searchFor(page: Page, term: string): Promise<void> {
  await page.getByLabel('Search products').fill(term)
  await page.getByRole('button', { name: 'Search' }).click()
  await expect(page.getByRole('heading', { name: 'Search results' })).toBeVisible()
}

function includesTerm(product: Product, term: string): boolean {
  const haystack = `${product.title} ${product.description}`.toLocaleLowerCase()
  return haystack.includes(term.toLocaleLowerCase())
}

test.beforeAll(async () => {
  const response = await fetch(appBaseUrl).catch(() => null)
  if (!response?.ok) {
    throw new Error(`Open ${appBaseUrl} first. Start the app with docker compose up --build.`)
  }
})

test('home page shows the five featured products', async ({ page }) => {
  const featured = await getProducts('/api/products/featured')

  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Featured products' })).toBeVisible()
  expect(featured).toHaveLength(5)
  await expect(page.locator('article h3')).toHaveText(featured.map((product) => visibleTitle(product.title)))
})

test('featured product cards show the title, price, and rating', async ({ page }) => {
  const [featured] = await getProducts('/api/products/featured')

  await page.goto('/')

  const card = page.locator('article').filter({
    has: page.getByRole('heading', { name: visibleTitle(featured.title), level: 3 }),
  })
  await expect(card.locator('.price')).toHaveText(formatPrice(featured.price))
  await expect(card.locator('.rating')).toHaveText(formatRating(featured.rating))
  await expect(card.locator('img')).toHaveAttribute('src', new RegExp(`/api/products/${featured.id}/image`))
})

test('clicking a category link opens that category page', async ({ page }) => {
  const [category] = await getData<string[]>('/api/products/categories')
  const label = formatCategory(category)

  await page.goto('/')
  await page.getByRole('link', { name: label, exact: true }).click()

  await expect(page).toHaveURL(new RegExp(`/category/${encodeURIComponent(category)}`))
  await expect(page.getByRole('heading', { level: 1, name: label })).toBeVisible()
})

test('a category page shows its top rated products first', async ({ page }) => {
  const category = "women's clothing"
  const ranked = rankByRating(await getProducts(`/api/products/category/${encodeURIComponent(category)}`))

  await page.goto('/')
  await page.getByRole('link', { name: "Women's Clothing", exact: true }).click()

  await expect(page.getByRole('heading', { name: 'Top rated' })).toBeVisible()
  expect(await sectionTitles(page, 'Top rated')).toEqual(ranked.slice(0, 3).map((product) => visibleTitle(product.title)))
})

test('a category page shows the additional products after the top rated ones', async ({ page }) => {
  const category = "women's clothing"
  const ranked = rankByRating(await getProducts(`/api/products/category/${encodeURIComponent(category)}`))

  await page.goto(`/category/${encodeURIComponent(category)}`)

  await expect(page.getByRole('heading', { name: 'Remaining products' })).toBeVisible()
  expect(await sectionTitles(page, 'Remaining products')).toEqual(
    ranked.slice(3).map((product) => visibleTitle(product.title)),
  )
  expect(ranked.length).toBeGreaterThan(3)
})

test('a category page only lists products from that category', async ({ page }) => {
  const category = 'jewelery'
  const products = await getProducts(`/api/products/category/${category}`)

  await page.goto(`/category/${category}`)

  const shown = [
    ...(await sectionTitles(page, 'Top rated')),
    ...(await sectionTitles(page, 'Remaining products')),
  ]
  expect(products.every((product) => product.category === category)).toBe(true)
  expect(shown).toEqual(rankByRating(products).map((product) => visibleTitle(product.title)))
})

test('searching by product name shows only products whose text matches', async ({ page }) => {
  const term = 'backpack'
  const matches = await getProducts(`/api/products/search?q=${encodeURIComponent(term)}`)

  await page.goto('/')
  await searchFor(page, term)

  await expect(page.locator('article h3')).toHaveText(matches.map((product) => visibleTitle(product.title)))
  expect(matches.length).toBeGreaterThan(0)
  expect(matches.every((product) => includesTerm(product, term))).toBe(true)
})

test('searching by description shows only products whose text matches', async ({ page }) => {
  const term = 'perfect'
  const matches = await getProducts(`/api/products/search?q=${encodeURIComponent(term)}`)

  await page.goto('/')
  await searchFor(page, term)

  await expect(page.locator('article h3')).toHaveText(matches.map((product) => visibleTitle(product.title)))
  expect(matches.every((product) => product.description.toLocaleLowerCase().includes(term))).toBe(true)
  expect(matches.every((product) => !product.title.toLocaleLowerCase().includes(term))).toBe(true)
})

test('a search with no matching products shows a friendly message', async ({ page }) => {
  const term = 'zzzz-not-a-product'

  await page.goto('/')
  await searchFor(page, term)

  await expect(page.getByText(`No products match "${term}". Try another search.`)).toBeVisible()
  await expect(page.locator('article')).toHaveCount(0)
})

test('clicking a product tile opens its details', async ({ page }) => {
  const [product] = await getProducts('/api/products/featured')

  await page.goto('/')
  await page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: visibleTitle(product.title), level: 3 }) })
    .getByRole('link')
    .click()

  await expect(page).toHaveURL(new RegExp(`/products/${product.id}$`))
  await expect(page.getByRole('heading', { level: 1, name: visibleTitle(product.title) })).toBeVisible()
  await expect(page.locator('.eyebrow')).toHaveText(formatCategory(product.category))
  await expect(page.locator('.product-detail .price')).toHaveText(formatPrice(product.price))
  await expect(page.locator('.product-detail .rating')).toHaveText(formatRating(product.rating))
  await expect(page.getByText(product.description)).toBeVisible()
  await expect(page.locator('.product-detail img')).toHaveAttribute(
    'src',
    new RegExp(`/api/products/${product.id}/image`),
  )
})
