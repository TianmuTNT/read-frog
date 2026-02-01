import { SUBTITLE_INTERCEPT_MESSAGE_TYPE } from '@/utils/constants/subtitles'

function getCurrentVideoId(): string | null {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('v')
}

export function injectXhrInterceptor() {
  const originalOpen = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ) {
    const urlString = typeof url === 'string' ? url : url.toString()

    if (!urlString.includes('api/timedtext')) {
      return originalOpen.call(this, method, url, async ?? true, username, password)
    }

    const interceptedUrl = new URL(urlString, window.location.origin)
    const requestVideoId = interceptedUrl.searchParams.get('v')
    const currentVideoId = getCurrentVideoId()

    if (requestVideoId !== currentVideoId) {
      return originalOpen.call(this, method, url, async ?? true, username, password)
    }

    this.addEventListener('loadend', function (this: XMLHttpRequest) {
      const lang = interceptedUrl.searchParams.get('lang') || 'unknown'
      const kind = interceptedUrl.searchParams.get('kind') || ''

      // Always send postMessage, even if responseText is empty
      // This allows the fetcher to handle empty responses and retry
      window.postMessage(
        {
          type: SUBTITLE_INTERCEPT_MESSAGE_TYPE,
          payload: this.responseText || '',
          lang,
          kind,
          url: urlString,
          errorStatus: this.status === 200 ? null : this.status,
        },
        window.location.origin,
      )
    }, { once: true })

    return originalOpen.call(this, method, url, async ?? true, username, password)
  }
}
