import './App.css'
import { useCallback, useMemo, useRef, useState } from 'react'
import { SidebarFiles } from './components/SidebarFiles'
import { SidebarPages } from './components/SidebarPages'
import { PdfPreview } from './components/PdfPreview'
import { MergeBar } from './components/MergeBar'
import type { AppError, PdfPageRef, PdfSource } from './features/pdf/pdfTypes'
import { getPdfPageCount, readFileBytes } from './features/pdf/pdfParse'
import { mergePdfByPages } from './features/pdf/pdfMerge'
import { bytesStore } from './features/pdf/bytesStore'

function App() {
  const [sources, setSources] = useState<PdfSource[]>([])
  const [pages, setPages] = useState<PdfPageRef[]>([])
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<AppError[]>([])
  const [outputName, setOutputName] = useState('merged.pdf')
  const [undoPages, setUndoPages] = useState<PdfPageRef[] | null>(null)

  const nextIdRef = useRef(1)
  const newId = useCallback((prefix: string) => `${prefix}_${nextIdRef.current++}`, [])

  const selectedPage = useMemo(
    () => (selectedPageId ? pages.find((p) => p.id === selectedPageId) ?? null : null),
    [pages, selectedPageId],
  )

  const pushError = useCallback((message: string) => {
    setErrors((prev) => [...prev, { id: newId('err'), message }])
  }, [newId])

  const addFiles = useCallback(
    async (fileList: FileList) => {
      // PDF 파일 필터링 (MIME 타입 또는 파일 확장자)
      const files = Array.from(fileList).filter((f) => {
        // MIME 타입이 application/pdf이거나, 파일 확장자가 .pdf인 경우
        return f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      })
      if (!files.length) return

      setBusy(true)
      try {
        const newSources: PdfSource[] = []
        const newPages: PdfPageRef[] = []

        for (const file of files) {
          try {
            const bytes = await readFileBytes(file)
            let pageCount = 0
            try {
              pageCount = await getPdfPageCount(bytes)
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error'
              pushError(`PDF를 읽을 수 없습니다: ${file.name} (${errorMessage})`)
              continue
            }

            const sourceId = newId('src')
            
            // bytes를 React 상태 외부에 저장 (detached 방지)
            bytesStore.set(sourceId, bytes)
            
            const src: PdfSource = {
              id: sourceId,
              file,
              fileName: file.name,
              size: file.size,
              pageCount,
            }
            newSources.push(src)

            for (let i = 0; i < pageCount; i++) {
              const pageId = newId('page')
              newPages.push({ id: pageId, sourceId, pageIndex: i, rotation: 0 })
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            pushError(`파일 읽기 실패: ${file.name} (${errorMessage})`)
            continue
          }
        }

        setSources((prev) => [...prev, ...newSources])
        setPages((prev) => [...prev, ...newPages])

        const firstSource = newSources[0]
        const firstPage = newPages[0]
        setSelectedSourceId((prev) => prev ?? firstSource?.id ?? null)
        setSelectedPageId((prev) => prev ?? firstPage?.id ?? null)
      } finally {
        setBusy(false)
      }
    },
    [newId, pushError],
  )

  const removeSource = useCallback((sourceId: string) => {
    // bytesStore에서 bytes 제거
    bytesStore.delete(sourceId)
    
    setSources((prev) => prev.filter((s) => s.id !== sourceId))
    setPages((prev) => prev.filter((p) => p.sourceId !== sourceId))
    setSelectedSourceId((prev) => (prev === sourceId ? null : prev))
    setSelectedPageId((prev) => {
      const page = pages.find((p) => p.id === prev)
      return page?.sourceId === sourceId ? null : prev
    })
  }, [pages])

  const reorderSourcesAndPages = useCallback(
    (nextSources: PdfSource[]) => {
      setSources(nextSources)
      setPages((prevPages) => {
        const pagesBySource = new Map<string, PdfPageRef[]>()
        for (const p of prevPages) {
          const list = pagesBySource.get(p.sourceId) ?? []
          list.push(p)
          pagesBySource.set(p.sourceId, list)
        }

        const out: PdfPageRef[] = []
        for (const s of nextSources) {
          const block = pagesBySource.get(s.id)
          if (block?.length) out.push(...block)
        }
        return out
      })
    },
    [setPages, setSources],
  )

  const pagesForSidebar = useMemo(() => {
    if (!selectedSourceId) return pages
    // Show all pages (merge order), but keep file selection meaningful.
    // In MVP, we still show the global list for direct reordering.
    return pages
  }, [pages, selectedSourceId])

  const canMerge = pages.length > 0 && sources.length > 0 && !busy

  const deleteSelectedPage = useCallback(() => {
    if (!selectedPageId) return
    setUndoPages(pages)
    setPages((prev) => prev.filter((p) => p.id !== selectedPageId))
    setSelectedPageId((prevSel) => {
      if (!prevSel) return prevSel
      const idx = pages.findIndex((p) => p.id === prevSel)
      if (idx === -1) return null
      const next = pages[idx + 1] ?? pages[idx - 1] ?? null
      return next?.id ?? null
    })
  }, [pages, selectedPageId])

  const undoLastDelete = useCallback(() => {
    if (!undoPages) return
    setPages(undoPages)
    setUndoPages(null)
  }, [undoPages])

  const rotateSelectedPage = useCallback((delta: 90 | -90) => {
    if (!selectedPageId) return
    setPages((prev) =>
      prev.map((p) => {
        if (p.id !== selectedPageId) return p
        const next = (((p.rotation + delta) % 360) + 360) % 360
        return { ...p, rotation: next as 0 | 90 | 180 | 270 }
      }),
    )
  }, [selectedPageId])

  const mergeDownload = useCallback(async () => {
    if (!canMerge) return
    setBusy(true)
    try {
      // Create a local copy of bytes needed for merge to prevent race conditions
      // with bytesStore mutations during async operation
      const bytesMapForMerge = new Map<string, Uint8Array>()
      for (const source of sources) {
        const bytes = bytesStore.get(source.id)
        if (bytes) {
          // Create a copy to ensure we have independent data even if original is modified
          bytesMapForMerge.set(source.id, bytes.slice(0))
        }
      }

      const outBytes = await mergePdfByPages({ sources, pages, bytesMap: bytesMapForMerge })
      const blob = new Blob([outBytes as unknown as BlobPart], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = outputName.trim() || 'merged.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('PDF merge error:', error)
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
      pushError(`병합 실패: ${errorMessage}`)
    } finally {
      setBusy(false)
    }
  }, [canMerge, outputName, pages, pushError, sources])

  return (
    <div className="appShell">
      <SidebarFiles
        sources={sources}
        selectedSourceId={selectedSourceId}
        onSelectSource={(id) => setSelectedSourceId(id)}
        onRemoveSource={removeSource}
        onReorderSources={reorderSourcesAndPages}
        onPickFiles={(files) => {
          if (files) void addFiles(files)
        }}
        onDropFiles={(files) => void addFiles(files)}
        busy={busy}
      />

      <main className="main">
        <header className="topBar">
          <div className="topTitle">PDF 미리보기</div>          
        </header>

        <MergeBar
          canMerge={canMerge}
          busy={busy}
          outputName={outputName}
          onChangeOutputName={setOutputName}
          onMergeDownload={() => void mergeDownload()}
          canEditPage={!!selectedPageId && !busy}
          canUndo={!!undoPages && !busy}
          onDeletePage={deleteSelectedPage}
          onUndo={undoLastDelete}
          onRotateLeft={() => rotateSelectedPage(-90)}
          onRotateRight={() => rotateSelectedPage(90)}
        />

        {errors.length ? (
          <div className="errorStack">
            {errors.map((e) => (
              <div key={e.id} className="errorBox">
                {e.message}
              </div>
            ))}
          </div>
        ) : null}

        <div className="content">
          <PdfPreview sources={sources} page={selectedPage} />
        </div>
      </main>

      <SidebarPages
        sources={sources}
        pages={pagesForSidebar}
        selectedPageId={selectedPageId}
        onSelectPage={(id) => setSelectedPageId(id)}
        onReorderPages={(next) => setPages(next)}
        busy={busy}
      />
    </div>
  )
}

export default App
