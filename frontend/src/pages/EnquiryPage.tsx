import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { getProduct } from '../api.ts'
import { EnquiryForm } from '../components/EnquiryForm.tsx'
import { ErrorStatus, LoadingStatus } from '../components/Status.tsx'
import { useCatalogueRequest } from '../hooks/useCatalogueRequest.ts'

export function EnquiryPage() {
  const { id = '' } = useParams()
  const { state, reload } = useCatalogueRequest(() => getProduct(id), [id])
  const [submitted, setSubmitted] = useState(false)

  if (state.status === 'loading') {
    return <LoadingStatus label="Loading product details." />
  }

  if (state.status === 'error') {
    return <ErrorStatus message={state.message} onRetry={reload} />
  }

  if (submitted) {
    return (
      <section className="notice" role="status">
        <h1>Thank you for your enquiry!</h1>
        <p>We received your enquiry about {state.data.title} and will be in touch.</p>
        <Link to={`/products/${state.data.id}`}>Back to product</Link>
      </section>
    )
  }

  return (
    <section>
      <h1>Enquire about {state.data.title}</h1>
      <EnquiryForm productId={state.data.id} onSuccess={() => setSubmitted(true)} />
    </section>
  )
}
