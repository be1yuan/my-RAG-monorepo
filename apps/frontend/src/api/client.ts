import { ErrorResponseSchema } from "shared-types"

const getApiBase = () => {
  // 如果在开发环境，使用空字符串走代理
  if (import.meta.env.DEV) {
    return ''
  }
  // 生产环境使用环境变量或默认值
  return import.meta.env.VITE_API_BASE || 'http://localhost:3000'
}

const API_BASE = getApiBase()

// 模拟当前用户(MVP:用 localStorage 存,后续接鉴权)
const USER_ID_KEY = 'kb_user_id'

export function getCurrentUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY)
  if (!id) {
    // 生成一个固定的 dev user id(MVP 简化)
    id = '00000000-0000-0000-0000-000000000001'
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id
}

export class ApiError extends Error {
  constructor (
    public status: number,
    public code: number,
    public message: string,
    public i18nKey?: string,
    public details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown,
  query?: Record<string, string | number | boolean | undefined>,
}

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { body, query, headers, ...rest } = options
  // query string
  let url = `${API_BASE}${path}`
  if (query) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue
      qs.set(k, String(v))
    }
    const s = qs.toString()
    if (s) {
      url += `?${s}`
    }
  }
  const res = await fetch(url, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': getCurrentUserId(),
      ...(headers as Record<string, string> | undefined),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) {
    return undefined as T
  }

  const text = await res.text()
  const data = text ? JSON.parse(text) : null

  if (!res.ok) {
    // 验证 ErrorResponse 格式
    const parsed = ErrorResponseSchema.safeParse(data)
    if (parsed.success) {
      throw new ApiError(
        res.status,
        parsed.data.error.code,
        parsed.data.error.message,
        parsed.data.error.i18n_key || undefined,
        parsed.data.error.details,
      )
    }
    throw new ApiError(
      res.status,
      99999,
      text || 'Request failed'
    )
  }
  return data as T
}
