import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { PdfPageRef, PdfSource } from '../features/pdf/pdfTypes'
import { loadPdfForRender, renderPageToCanvas } from '../features/pdf/pdfRender'
import { bytesStore } from '../features/pdf/bytesStore'

export type SidebarPagesProps = {
  sources: PdfSource[]
  pages: PdfPageRef[]
  selectedPageId: string | null
  onSelectPage: (pageId: string) => void
  onReorderPages: (next: PdfPageRef[]) => void
  busy: boolean
}

type PageRowProps = {
  sources: PdfSource[]
  page: PdfPageRef
  active: boolean
  onSelect: () => void
  disabled: boolean
}

function useInView<T extends Element>(opts?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), opts)
    obs.observe(el)
    return () => obs.disconnect()
  }, [opts])

  return { ref, inView }
}

function PageRow({ sources, page, active, onSelect, disabled }: PageRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: page.id, disabled })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  }

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [thumbError, setThumbError] = useState<string | null>(null)
  const source = useMemo(
    () => sources.find((s) => s.id === page.sourceId) ?? null,
    [page.sourceId, sources],
  )
  const { ref: inViewRef, inView } = useInView<HTMLDivElement>({ rootMargin: '800px 0px' })

  useEffect(() => {
    let cancelled = false
    async function run() {
      setThumbError(null)
      const canvas = canvasRef.current
      if (!canvas || !source || !inView) return
      try {
        // bytesStore에서 bytes 가져오기
        const bytes = bytesStore.get(source.id)
        if (!bytes) {
          throw new Error('PDF bytes not found')
        }
        // Create a copy to ensure we have independent data even if original is modified
        const bytesCopy = bytes.slice(0)
        const pdf = await loadPdfForRender({ cacheKey: source.id, bytes: bytesCopy })
        await renderPageToCanvas({
          pdf,
          pageNumber: page.pageIndex + 1,
          canvas,
          scale: 0.25,
          rotation: page.rotation,
        })
      } catch (e) {
        if (cancelled) return
        setThumbError(e instanceof Error ? e.message : 'Thumb render failed')
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [inView, page.pageIndex, page.rotation, source])

  return (
    <li ref={setNodeRef} style={style} className={`pageRow ${active ? 'active' : ''}`}>
      <button
        className="pageSelect"
        onClick={onSelect}
        disabled={disabled}
        title="Select page"
      >
        <div className="thumb" ref={inViewRef}>
          <canvas ref={canvasRef} className="thumbCanvas" />
          {!inView ? <div className="thumbPlaceholder" /> : null}
        </div>
        <div className="pageLabel">
          <div className="pageNum">p{page.pageIndex + 1}</div>
          <div className="pageSrc">{source?.fileName ?? 'Unknown'}</div>
          {thumbError ? <div className="pageErr">render error</div> : null}
        </div>
      </button>
      <button
        className="dragHandle"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        title="Drag to reorder"
        disabled={disabled}
      >
        ⋮⋮
      </button>
    </li>
  )
}

export function SidebarPages({
  sources,
  pages,
  selectedPageId,
  onSelectPage,
  onReorderPages,
  busy,
}: SidebarPagesProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const ids = useMemo(() => pages.map((p) => p.id), [pages])

  return (
    <aside className="sidebar pagesSidebar">
      <div className="sidebarSectionTitle">페이지(드래그로 재정렬)</div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(evt) => {
          const { active, over } = evt
          if (!over || active.id === over.id) return
          const oldIndex = pages.findIndex((p) => p.id === active.id)
          const newIndex = pages.findIndex((p) => p.id === over.id)
          if (oldIndex === -1 || newIndex === -1) return
          onReorderPages(arrayMove(pages, oldIndex, newIndex))
        }}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="pageList">
            {pages.map((p) => (
              <PageRow
                key={p.id}
                sources={sources}
                page={p}
                active={p.id === selectedPageId}
                onSelect={() => onSelectPage(p.id)}
                disabled={busy}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </aside>
  )
}

