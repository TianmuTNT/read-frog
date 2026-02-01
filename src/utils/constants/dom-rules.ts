import { STATE_MESSAGE_CLASS, SUBTITLES_VIEW_CLASS, TRANSLATE_BUTTON_CLASS, YOUTUBE_NATIVE_SUBTITLES_CLASS } from './subtitles'

// Type definitions for DOM rules configuration
export interface DomRulesConfig {
  dontWalkIntoSelectors?: Record<string, string[]>
  forceBlockTranslationSelectors?: Record<string, string[]>
}

export const FORCE_BLOCK_TAGS = new Set([
  'BODY',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'BR',
  'FORM',
  'SELECT',
  'BUTTON',
  'LABEL',
  'UL',
  'OL',
  'LI',
  'BLOCKQUOTE',
  'PRE',
  'ARTICLE',
  'SECTION',
  'FIGURE',
  'FIGCAPTION',
  'HEADER',
  'FOOTER',
  'MAIN',
  'NAV',
])

export const MATH_TAGS = new Set([
  'math',
  'maction',
  'annotation',
  'annotation-xml',
  'menclose',
  'merror',
  'mfenced',
  'mfrac',
  'mi',
  'mmultiscripts',
  'mn',
  'mo',
  'mover',
  'mpadded',
  'mphantom',
  'mprescripts',
  'mroot',
  'mrow',
  'ms',
  'mspace',
  'msqrt',
  'mstyle',
  'msub',
  'msubsup',
  'msup',
  'mtable',
  'mtd',
  'mtext',
  'mtr',
  'munder',
  'munderover',
  'semantics',
])

// Don't walk into these tags
export const DONT_WALK_AND_TRANSLATE_TAGS = new Set([
  'HEAD',
  'TITLE',
  'HR',
  'INPUT',
  'TEXTAREA',
  'IMG',
  'VIDEO',
  'AUDIO',
  'CANVAS',
  'SOURCE',
  'TRACK',
  'META',
  'SCRIPT',
  'NOSCRIPT',
  'STYLE',
  'LINK',
  'PRE',
  'svg',
  ...MATH_TAGS,
])

export const DONT_WALK_BUT_TRANSLATE_TAGS = new Set([
  'CODE',
  'TIME',
])

export const FORCE_INLINE_TRANSLATION_TAGS = new Set([
  'A',
  'BUTTON',
  'SELECT',
  'OPTION',
  'SPAN',
])

export const MAIN_CONTENT_IGNORE_TAGS = new Set(['HEADER', 'FOOTER', 'NAV', 'NOSCRIPT'])

export const CUSTOM_DONT_WALK_INTO_ELEMENT_SELECTOR_MAP: Record<string, string[]> = {
  'chatgpt.com': [
    '.ProseMirror',
  ],
  'arxiv.org': [
    '.ltx_listing',
  ],
  'www.reddit.com': [
    'faceplate-screen-reader-content > *',
    'reddit-header-large *',
    'shreddit-comment-action-row > *',
  ],
  'www.youtube.com': [
    '#masthead-container *',
    '#guide-inner-content *',
    '#metadata *',
    '#channel-name',
    '.translate-button',
    '.yt-lockup-metadata-view-model__metadata',
    '.yt-spec-avatar-shape__badge-text',
    '.shortsLockupViewModelHostOutsideMetadataSubhead',
    'ytd-comments-header-renderer',
    '#top-row',
    '#header-author',
    '#reply-button-end',
    '#more-replies',
    '#info',
    '#badges *',
    `${YOUTUBE_NATIVE_SUBTITLES_CLASS}`,
    `.${SUBTITLES_VIEW_CLASS}`,
    `.${STATE_MESSAGE_CLASS}`,
    `.${TRANSLATE_BUTTON_CLASS}`,
  ],
  'discord.com': [
    '[id^="message-username"]',
    'span[class*="-timestamp"]',
    'div[class*="-repliedMessage"]',
    'li[class*="-containerDefault"]',
    '[class*="-subtitleContainer"]',
    '[class*="-formWithLoadedChatInput"]',
  ],
  'github.com': [
    '[aria-labelledby="folders-and-files"] *',
    'header *',
    '#repository-container-header *',
    '[class*="OverviewContent-module__Box_1--"] *',
  ],
}

export const CUSTOM_FORCE_BLOCK_TRANSLATION_SELECTOR_MAP: Record<string, string[]> = {
  'github.com': [
    'task-lists', // https://github.com/mengxi-ream/read-frog/issues/867
  ],
  'engoo.com': [
    '#windowexercise-2 > div > div > div.css-ep7xq6 > div > div > div.css-19m2fbm *',
  ],
}

/**
 * Convert glob pattern to RegExp for URL matching
 * Supports: *, **, and protocol-optional patterns
 */
function globToRegex(pattern: string): RegExp {
  let regexStr = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&')

  regexStr = regexStr.replace(/\*\*/g, '§DBL§')
  regexStr = regexStr.replace(/\*/g, '[^/]*')
  regexStr = regexStr.replace(/§DBL§/g, '.*')
  regexStr = regexStr.replace(/^https?:\/\//, '(?:https?:\\/\\/)?')

  return new RegExp(`^${regexStr}$`, 'i')
}

export function matchUrlPattern(url: string, pattern: string): boolean {
  if (url === pattern)
    return true

  if (!pattern.includes('*')) {
    const cleanUrl = url.replace(/^https?:\/\//, '')
    const cleanPattern = pattern.replace(/^https?:\/\//, '')
    return cleanUrl === cleanPattern
  }

  const regex = globToRegex(pattern)
  if (regex.test(url))
    return true

  if (!pattern.startsWith('http://') && !pattern.startsWith('https://')) {
    return regex.test(url.replace(/^https?:\/\//, ''))
  }

  return false
}

/**
 * Build full URL from current location for matching
 */
function getCurrentUrl(): string {
  return window.location.href
}

export function findMatchingSelectors(
  map: Record<string, string[]>,
  currentUrl?: string,
): string[] {
  const url = currentUrl || getCurrentUrl()
  const hostname = currentUrl
    ? (() => {
        try {
          return new URL(currentUrl).hostname || currentUrl
        }
        catch {
          return currentUrl
        }
      })()
    : window.location.hostname

  if (map[hostname])
    return map[hostname]
  if (map[url])
    return map[url]

  for (const [pattern, selectors] of Object.entries(map)) {
    if (matchUrlPattern(url, pattern) || matchUrlPattern(hostname, pattern)) {
      return selectors
    }
  }

  return []
}

async function loadDomRulesFromJson(): Promise<DomRulesConfig | null> {
  try {
    const rulesModule = await import('@/assets/dom-rules.json')
    const rules = rulesModule.default as DomRulesConfig
    return rules && typeof rules === 'object' ? rules : null
  }
  catch {
    return null
  }
}

export async function initializeDomRules(): Promise<void> {
  const loadedRules = await loadDomRulesFromJson()
  if (!loadedRules)
    return

  if (loadedRules.dontWalkIntoSelectors) {
    for (const [domain, selectors] of Object.entries(loadedRules.dontWalkIntoSelectors)) {
      if (CUSTOM_DONT_WALK_INTO_ELEMENT_SELECTOR_MAP[domain]) {
        const existing = CUSTOM_DONT_WALK_INTO_ELEMENT_SELECTOR_MAP[domain]
        CUSTOM_DONT_WALK_INTO_ELEMENT_SELECTOR_MAP[domain] = [...new Set([...existing, ...selectors])]
      }
      else {
        CUSTOM_DONT_WALK_INTO_ELEMENT_SELECTOR_MAP[domain] = selectors
      }
    }
  }

  if (loadedRules.forceBlockTranslationSelectors) {
    for (const [domain, selectors] of Object.entries(loadedRules.forceBlockTranslationSelectors)) {
      if (CUSTOM_FORCE_BLOCK_TRANSLATION_SELECTOR_MAP[domain]) {
        const existing = CUSTOM_FORCE_BLOCK_TRANSLATION_SELECTOR_MAP[domain]
        CUSTOM_FORCE_BLOCK_TRANSLATION_SELECTOR_MAP[domain] = [...new Set([...existing, ...selectors])]
      }
      else {
        CUSTOM_FORCE_BLOCK_TRANSLATION_SELECTOR_MAP[domain] = selectors
      }
    }
  }
}

initializeDomRules().catch(() => {
  // Silent fail - use default rules
})
