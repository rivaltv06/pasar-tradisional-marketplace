export type ApiOk<T> = { success: true; data: T }
export type ApiErr = { success: false; error: string }
export type ApiResponse<T> = ApiOk<T> | ApiErr

function isApiErr<T>(res: ApiResponse<T>): res is ApiErr {
  return res.success === false
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  const json = (await res.json()) as ApiResponse<T>
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
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
  const json = (await res.json()) as ApiResponse<T>
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  if (isApiErr(json)) throw new Error(json.error)
  return json.data
}
