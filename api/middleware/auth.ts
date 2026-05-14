import type { NextFunction, Request, Response } from 'express'
import { getSessionUserId } from '../auth-utils.js'
import { getDb, type UserRole, type UserRow } from '../store.js'

export type AuthContext = {
  user: UserRow
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }

  const userId = getSessionUserId(token)
  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }

  const db = await getDb()
  const user = db.users.find((u) => u.id === userId)
  if (!user) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }

  res.locals.auth = { user } satisfies AuthContext
  next()
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const auth = res.locals.auth as AuthContext | undefined
    if (!auth?.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }
    if (!roles.includes(auth.user.role)) {
      res.status(403).json({ success: false, error: 'Forbidden' })
      return
    }
    next()
  }
}

