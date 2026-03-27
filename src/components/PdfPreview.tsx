import { useEffect, useMemo, useRef, useState } from 'react'
import type { PdfPageRef, PdfSource } from '../features/pdf/pdfTypes'
import { loadPdfForRender, renderPageToCanvas } from '../features/pdf/pdfRender'
import { bytesStore } from '../features/pdf/bytesStore'

export type PdfPreviewProps = {
  sources: PdfSource[]
  page: PdfPageRef | null
}

export function PdfPreview({ sources, page }: PdfPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const source = useMemo(
    () => (page ? sources.find((s) => s.id === page.sourceId) ?? null : null),
    [page, sources],
  )

  useEffect(() => {
    let cancelled = false
    async function run() {
      setError(null)
      const canvas = canvasRef.current
      if (!canvas || !page || !source) return
      try {
        // bytesStore에서 bytes 가져오기
        const bytes = bytesStore.get(source.id)
        if (!bytes) {
          throw new Error('PDF bytes not found')
        }
        // Create a copy to ensure we have independent data even if original is modified
        const bytesCopy = bytes.slice(0)
        const pdf = await loadPdfForRender({ cacheKey: source.id, bytes: bytesCopy })
        // pageNumber is 1-based for pdfjs
        await renderPageToCanvas({
          pdf,
          pageNumber: page.pageIndex + 1,
          canvas,
          scale: 1.5,
          rotation: page.rotation,
        })
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to render preview')
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [page, source])

  if (!page || !source) {
    return (
      <div className="previewEmpty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="previewEmptyIcon">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
        <div className="previewEmptyTitle">PDF를 추가하고 페이지를 선택하세요</div>
        <div className="previewEmptyHint">좌측에서 파일을 추가할 수 있어요.</div>
      </div>
    )
  }

  return (
    <div className="preview">
      <div className="previewHeader">
        <div className="previewTitle">{source.fileName}</div>
        <div className="previewMeta">page {page.pageIndex + 1}</div>
      </div>
      {error ? <div className="errorBox">{error}</div> : null}
      <div className="previewCanvasWrap">
        <canvas ref={canvasRef} className="previewCanvas" />
      </div>
    </div>
  )
}

