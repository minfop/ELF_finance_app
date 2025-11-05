//export const API_BASE_URL = 'http://localhost:3000/api'//
export const API_BASE_URL = 'https://elf-finance-api.onrender.com/api'

export function buildApiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalized}`
}


