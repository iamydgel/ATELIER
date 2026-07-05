import { useState, useEffect } from 'react'

interface WindowSize {
  width: number
  isMobile: boolean
}

/** Returns current viewport width and whether it is below 768px (mobile). */
export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>(() => ({
    width: window.innerWidth,
    isMobile: window.innerWidth < 768,
  }))

  useEffect(() => {
    const handler = () => {
      setSize({
        width: window.innerWidth,
        isMobile: window.innerWidth < 768,
      })
    }

    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return size
}
