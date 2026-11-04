import { Router } from 'express'
import { asyncRoute } from '../http/async-route.js'
import type { EnquiryService } from '../services/enquiry-service.js'
import { parseEnquiry } from '../validation/parse-request.js'

export function createEnquiryRouter(enquiries: EnquiryService): Router {
  const router = Router()

  router.post(
    '/',
    asyncRoute(async (req, res) => {
      const enquiry = await enquiries.submit(parseEnquiry(req.body))
      res.status(201).json({ data: enquiry })
    }),
  )

  return router
}
