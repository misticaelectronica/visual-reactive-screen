/// <reference types="vite/client" />

import type { ControlApi } from '@shared/types'
import type { OutputApi } from '@shared/types'

declare global {
  interface Window {
    fxControl?: ControlApi
    fxOutput?: OutputApi
  }
}

export {}
