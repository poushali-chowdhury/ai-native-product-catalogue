import { useState, type FormEvent, type ReactNode } from 'react'
import { ApiError, submitEnquiry } from '../api.ts'
import { validateEnquiry } from '../enquiry.ts'

export function EnquiryForm({
  productId,
  onSuccess,
}: {
  productId: number
  onSuccess: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateEnquiry({ name, email, phone, message })
    setErrors(nextErrors)
    setFormError('')

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setSubmitting(true)

    try {
      await submitEnquiry({
        productId,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        message: message.trim(),
      })
      onSuccess()
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message)
        setErrors(error.fields ?? {})
      } else {
        setFormError('Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="enquiry-form" noValidate onSubmit={onSubmit}>
      <Field id="customer-name" label="Name" error={errors.name}>
        <input
          id="customer-name"
          name="name"
          autoComplete="name"
          value={name}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'customer-name-error' : undefined}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      <Field id="customer-email" label="Email address" error={errors.email}>
        <input
          id="customer-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'customer-email-error' : undefined}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>
      <Field id="customer-phone" label="Phone number" error={errors.phone}>
        <input
          id="customer-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? 'customer-phone-error' : undefined}
          onChange={(event) => setPhone(event.target.value)}
        />
      </Field>
      <Field id="customer-message" label="Message" error={errors.message}>
        <textarea
          id="customer-message"
          name="message"
          rows={5}
          value={message}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? 'customer-message-error' : undefined}
          onChange={(event) => setMessage(event.target.value)}
        />
      </Field>
      {formError ? (
        <p className="field-error" role="alert">
          {formError}
        </p>
      ) : null}
      {submitting ? <p role="status">Sending your enquiry.</p> : null}
      <button type="submit" disabled={submitting}>
        Submit
      </button>
    </form>
  )
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  )
}
