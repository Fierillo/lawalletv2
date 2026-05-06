export function normalizePublicHost(value?: string): string {
  const raw = value?.trim().toLowerCase().replace(/\/+$/, '') || ''
  if (!raw) {
    return ''
  }

  try {
    return new URL(raw.includes('://') ? raw : `https://${raw}`).host
  } catch {
    return raw
  }
}

export function normalizePublicSubdomain(subdomain?: string, domain?: string): string {
  const cleanDomain = normalizePublicHost(domain)
  const cleanSubdomain = normalizePublicHost(subdomain)

  if (!cleanSubdomain || cleanSubdomain === cleanDomain) {
    return ''
  }

  if (cleanDomain && cleanSubdomain.endsWith(`.${cleanDomain}`)) {
    return cleanSubdomain.slice(0, -cleanDomain.length - 1)
  }

  return cleanSubdomain.includes('.') ? '' : cleanSubdomain
}

function isLocalHost(host: string): boolean {
  return (
    host === 'localhost' ||
    host.startsWith('localhost:') ||
    host.endsWith('.localhost') ||
    host.includes('.localhost:') ||
    host.startsWith('127.')
  )
}

/**
 * Joins a domain and optional subdomain into a single host string,
 * lowercasing and trimming both. Returns `''` when `domain` is missing.
 */
export function buildPublicHost(domain?: string, subdomain?: string): string {
  const cleanDomain = normalizePublicHost(domain)
  const cleanSubdomain = normalizePublicSubdomain(subdomain, cleanDomain)

  if (!cleanDomain) {
    return ''
  }

  return cleanSubdomain ? `${cleanSubdomain}.${cleanDomain}` : cleanDomain
}

/**
 * Wraps `host` in a scheme — `http://` for any localhost variant,
 * `https://` otherwise. Returns `''` when `host` is missing.
 */
export function buildPublicUrl(host?: string): string {
  const cleanHost = normalizePublicHost(host)

  if (!cleanHost) {
    return ''
  }

  return `${isLocalHost(cleanHost) ? 'http' : 'https'}://${cleanHost}`
}
