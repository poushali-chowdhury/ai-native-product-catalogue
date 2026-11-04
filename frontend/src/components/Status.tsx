export function LoadingStatus({ label }: { label: string }) {
  return (
    <p className="status" role="status">
      {label}
    </p>
  )
}

export function ErrorStatus({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="status status-error" role="alert">
      <p>{message}</p>
      <button type="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}

export function EmptyStatus({ message }: { message: string }) {
  return <p className="status">{message}</p>
}
