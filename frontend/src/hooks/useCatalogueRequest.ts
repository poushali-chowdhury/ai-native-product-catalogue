import { useEffect, useRef, useState } from 'react'

interface LoadingState {
  status: 'loading'
}

interface SuccessState<T> {
  status: 'success'
  data: T
}

interface ErrorState {
  status: 'error'
  message: string
}

export type CatalogueRequest<T> = LoadingState | SuccessState<T> | ErrorState

export function useCatalogueRequest<T>(load: () => Promise<T>, deps: readonly unknown[]) {
  const loadRef = useRef(load)
  const [reloadKey, setReloadKey] = useState(0)
  const [state, setState] = useState<CatalogueRequest<T>>({ status: 'loading' })
  loadRef.current = load

  useEffect(() => {
    let active = true
    setState({ status: 'loading' })

    loadRef.current().then(
      (data) => {
        if (active) {
          setState({ status: 'success', data })
        }
      },
      (error: unknown) => {
        if (!active) {
          return
        }

        setState({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Something went wrong. Please try again.',
        })
      },
    )

    return () => {
      active = false
    }
  }, [reloadKey, ...deps])

  return {
    state,
    reload: () => setReloadKey((value) => value + 1),
  }
}
