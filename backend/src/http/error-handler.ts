import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../errors.js'

interface ErrorBody {
  error: {
    code: string
    message: string
    fields?: Record<string, string>
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'That resource was not found.',
    },
  } satisfies ErrorBody)
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error)
    return
  }

  if (error instanceof AppError) {
    const body: ErrorBody = {
      error: {
        code: error.code,
        message: error.message,
      },
    }

    if (error.fields && Object.keys(error.fields).length > 0) {
      body.error.fields = error.fields
    }

    res.status(error.statusCode).json(body)
    return
  }

  if (isJsonParseError(error)) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The request body must be valid JSON.',
      },
    } satisfies ErrorBody)
    return
  }

  console.error(error)
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again.',
    },
  } satisfies ErrorBody)
}

function isJsonParseError(error: unknown): boolean {
  return (
    error instanceof SyntaxError &&
    'status' in error &&
    error.status === 400 &&
    'type' in error &&
    error.type === 'entity.parse.failed'
  )
}
