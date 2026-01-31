import { useEffect, useEffectEvent, useState } from 'react'
import { getContainingShadowRoot } from '@/utils/host/dom/node'

type CheckVisibilityFn = (container: HTMLElement) => boolean

export function useControlsVisible(
  elementRef: React.RefObject<HTMLElement | null>,
  checkVisibility?: CheckVisibilityFn,
) {
  const [controlsVisible, setControlsVisible] = useState(false)

  const updateVisibility = useEffectEvent((container: HTMLElement) => {
    if (checkVisibility) {
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setControlsVisible(checkVisibility(container))
    }
  })

  useEffect(() => {
    if (!checkVisibility)
      return

    const element = elementRef.current
    if (!element)
      return

    const shadowRoot = getContainingShadowRoot(element)
    const shadowHost = shadowRoot?.host as HTMLElement | undefined
    const videoContainer = shadowHost?.parentElement
    if (!videoContainer)
      return

    updateVisibility(videoContainer)

    const observer = new MutationObserver(() => {
      updateVisibility(videoContainer)
    })

    observer.observe(videoContainer, {
      attributes: true,
      attributeFilter: ['class'],
      subtree: true,
    })

    return () => observer.disconnect()
  }, [elementRef, checkVisibility])

  return controlsVisible
}
