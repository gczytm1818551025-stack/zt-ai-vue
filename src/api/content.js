const BASE_API = '/api'

export function getDownloadUrl(uuid, name) {
  return `${BASE_API}/public/content/download/${uuid}?name=${encodeURIComponent(name)}`
}

export function getPreviewUrl(uuid) {
  return `${BASE_API}/public/content/open/${uuid}`
}
