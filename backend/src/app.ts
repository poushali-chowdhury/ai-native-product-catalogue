import express from 'express'
import { readConfig, readMailConfig, type AppConfig } from './config.js'
import type { EmailSender } from './email/email-sender.js'
import { SmtpEmailSender } from './email/smtp-email-sender.js'
import type { EnquiryRepository } from './enquiries/enquiry-repository.js'
import { InMemoryEnquiryRepository } from './enquiries/enquiry-repository.js'
import { errorHandler, notFoundHandler } from './http/error-handler.js'
import { FakeStoreProductProvider } from './providers/fake-store-provider.js'
import type { ProductProvider } from './providers/product-provider.js'
import { createEnquiryRouter } from './routes/enquiry-routes.js'
import { createProductRouter } from './routes/product-routes.js'
import { EnquiryService } from './services/enquiry-service.js'
import { ProductService } from './services/product-service.js'

export interface AppDependencies {
  config?: AppConfig
  productProvider?: ProductProvider
  enquiryRepository?: EnquiryRepository
  emailSender?: EmailSender
}

export function createApp(dependencies: AppDependencies = {}) {
  const config = dependencies.config ?? readConfig()
  const productProvider =
    dependencies.productProvider ??
    new FakeStoreProductProvider({
      baseUrl: config.fakeStoreBaseUrl,
      timeoutMs: config.upstreamTimeoutMs,
    })
  const enquiryRepository =
    dependencies.enquiryRepository ?? new InMemoryEnquiryRepository()
  const emailSender = dependencies.emailSender ?? new SmtpEmailSender(readMailConfig())
  const products = new ProductService(productProvider)
  const enquiries = new EnquiryService(productProvider, enquiryRepository, emailSender)

  const app = express()
  app.disable('x-powered-by')
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', config.frontendOrigin)
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Vary', 'Origin')

    if (req.method === 'OPTIONS') {
      res.sendStatus(204)
      return
    }

    next()
  })
  app.use(express.json())

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok' })
  })
  app.use('/api/products', createProductRouter(products))
  app.use('/api/enquiries', createEnquiryRouter(enquiries))
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
