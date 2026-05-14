export type ApiOk<T> = { success: true; data: T }
export type ApiErr = { success: false; error: string }
export type ApiResponse<T> = ApiOk<T> | ApiErr

function isApiErr<T>(res: ApiResponse<T>): res is ApiErr {
  return res.success === false
}

async function readBodySafe(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function extractErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const maybeErr = (body as { error?: unknown }).error
  return typeof maybeErr === 'string' && maybeErr.trim() ? maybeErr : null
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  const body = await readBodySafe(res)
  if (!res.ok) {
    if (res.status === 401) throw new Error('Sesi habis. Silakan masuk lagi.')
    const msg = extractErrorMessage(body)
    throw new Error(msg ?? `HTTP ${res.status}`)
  }
  if (!body || typeof body !== 'object') throw new Error('Respons tidak valid.')
  const json = body as ApiResponse<T>
  if (isApiErr(json)) throw new Error(json.error)
  return json.data
}

export async function apiSend<T>(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const respBody = await readBodySafe(res)
  if (!res.ok) {
    if (res.status === 401) throw new Error('Sesi habis. Silakan masuk lagi.')
    const msg = extractErrorMessage(respBody)
    throw new Error(msg ?? `HTTP ${res.status}`)
  }
  if (!respBody || typeof respBody !== 'object') throw new Error('Respons tidak valid.')
  const json = respBody as ApiResponse<T>
  if (isApiErr(json)) throw new Error(json.error)
  return json.data
}

export async function apiSendForm<T>(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  form: FormData,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(path, {
    method,
    headers: Object.keys(headers).length ? headers : undefined,
    body: form,
  })
  const respBody = await readBodySafe(res)
  if (!res.ok) {
    if (res.status === 401) throw new Error('Sesi habis. Silakan masuk lagi.')
    const msg = extractErrorMessage(respBody)
    throw new Error(msg ?? `HTTP ${res.status}`)
  }
  if (!respBody || typeof respBody !== 'object') throw new Error('Respons tidak valid.')
  const json = respBody as ApiResponse<T>
  if (isApiErr(json)) throw new Error(json.error)
  return json.data
}
