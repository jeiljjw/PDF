// bytes를 React 상태 외부에 저장 (detached 방지)
// window 객체에 저장하여 HMR로 인한 초기화 방지
declare global {
  interface Window {
    __bytesStore?: Map<string, Uint8Array>
  }
}

export const bytesStore: Map<string, Uint8Array> = 
  typeof window !== 'undefined' 
    ? (window.__bytesStore = window.__bytesStore || new Map())
    : new Map()
