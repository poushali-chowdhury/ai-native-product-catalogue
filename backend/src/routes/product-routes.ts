import { Router } from 'express'
import { asyncRoute } from '../http/async-route.js'
import type { ProductService } from '../services/product-service.js'
import {
  parseCategory,
  parseProductId,
  parseSearchQuery,
} from '../validation/parse-request.js'

export function createProductRouter(products: ProductService): Router {
  const router = Router()

  router.get(
    '/',
    asyncRoute(async (_req, res) => {
      res.status(200).json({ data: await products.getAll() })
    }),
  )

  router.get(
    '/featured',
    asyncRoute(async (_req, res) => {
      res.status(200).json({ data: await products.getFeatured() })
    }),
  )

  router.get(
    '/categories',
    asyncRoute(async (_req, res) => {
      res.status(200).json({ data: await products.getCategories() })
    }),
  )

  router.get(
    '/category/:category',
    asyncRoute(async (req, res) => {
      const category = parseCategory(req.params.category)
      res.status(200).json({ data: await products.getByCategory(category) })
    }),
  )

  router.get(
    '/search',
    asyncRoute(async (req, res) => {
      const query = parseSearchQuery(req.query.q)
      res.status(200).json({ data: await products.search(query) })
    }),
  )

  router.get(
    '/:id/image',
    asyncRoute(async (req, res) => {
      const image = await products.getImage(parseProductId(req.params.id))
      res.status(200).type(image.contentType).send(Buffer.from(image.data))
    }),
  )

  router.get(
    '/:id',
    asyncRoute(async (req, res) => {
      const product = await products.getById(parseProductId(req.params.id))
      res.status(200).json({ data: product })
    }),
  )

  return router
}
