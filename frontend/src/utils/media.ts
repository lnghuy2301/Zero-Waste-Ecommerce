export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'
).replace(/\/$/, '')
export const BACKEND_URL = (
  import.meta.env.VITE_BACKEND_URL || API_BASE_URL.replace(/\/api\/v1$/, '')
).replace(/\/$/, '')

export function mediaUrl(path?: string | null): string {
  if (!path) return '/images/product-placeholder.svg'
  // Static demo illustrations ship with the frontend and work without external hosts.
  if (path.startsWith('/images/')) return path
  if (/^https?:\/\//i.test(path)) return path
  return `${BACKEND_URL}/${path.replace(/^\//, '')}`
}
