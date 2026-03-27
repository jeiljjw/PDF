import { useState } from 'react'
import type { PdfSource } from '../features/pdf/pdfTypes'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export type SidebarFilesProps = {
  sources: PdfSource[]
  selectedSourceId: string | null
  onSelectSource: (sourceId: string) => void
  onRemoveSource: (sourceId: string) => void
  onReorderSources: (next: PdfSource[]) => void
  onPickFiles: (files: FileList | null) => void
  onDropFiles: (files: FileList) => void
  busy: boolean
}

type FileRowProps = {
  source: PdfSource
  active: boolean
  onSelect: () => void
  onRemove: () => void
  disabled: boolean
}

function FileRow({ source, active, onSelect, onRemove, disabled }: FileRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: source.id, disabled })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  }

  return (
    <li ref={setNodeRef} style={style} className={`fileRow ${active ? 'active' : ''}`}>
      <button
        className="fileButton"
        onClick={onSelect}
        disabled={disabled}
        title={source.fileName}
      >
        <div className="fileName">{source.fileName}</div>
        <div className="fileMeta">{source.pageCount}p</div>
      </button>
      <button
        className="dragHandle"
        {...attributes}
        {...listeners}
        aria-label="Drag file to reorder"
        title="Drag file to reorder"
        disabled={disabled}
      >
        ⋮⋮
      </button>
      <button
        className="iconButton removeButton"
        onClick={onRemove}
        disabled={disabled}
        aria-label="Remove file"
        title="Remove file"
      >
        ×
      </button>
    </li>
  )
}

export function SidebarFiles({
  sources,
  selectedSourceId,
  onSelectSource,
  onRemoveSource,
  onReorderSources,
  onPickFiles,
  onDropFiles,
  busy,
}: SidebarFilesProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const ids = sources.map((s) => s.id)
  const [confirmRemoveSourceId, setConfirmRemoveSourceId] = useState<string | null>(null)

  const handleRemoveClick = (sourceId: string) => {
    setConfirmRemoveSourceId(sourceId)
  }

  const handleConfirmRemove = () => {
    if (confirmRemoveSourceId) {
      onRemoveSource(confirmRemoveSourceId)
      setConfirmRemoveSourceId(null)
    }
  }

  const handleCancelRemove = () => {
    setConfirmRemoveSourceId(null)
  }

  return (
    <aside className="sidebar">
      <div className="sidebarHeader">
        <div className="sidebarTitle">PDF 파일</div>
        <label className="button">
          파일 추가
          <input
            type="file"
            accept="application/pdf"
            multiple
            onChange={(e) => onPickFiles(e.target.files)}
            disabled={busy}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      <div
        className="dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          if (e.dataTransfer.files?.length) onDropFiles(e.dataTransfer.files)
        }}
      >
        <div className="dropzoneText">여기로 PDF를 드롭해서 추가</div>
      </div>

      <div className="sidebarSectionTitle">파일</div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(evt) => {
          const { active, over } = evt
          if (!over || active.id === over.id) return
          const oldIndex = sources.findIndex((s) => s.id === active.id)
          const newIndex = sources.findIndex((s) => s.id === over.id)
          if (oldIndex === -1 || newIndex === -1) return
          onReorderSources(arrayMove(sources, oldIndex, newIndex))
        }}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="fileList">
            {sources.map((s) => (
              <FileRow
                key={s.id}
                source={s}
                active={s.id === selectedSourceId}
                onSelect={() => onSelectSource(s.id)}
                onRemove={() => handleRemoveClick(s.id)}
                disabled={busy}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {/* Confirm Remove Dialog */}
      {confirmRemoveSourceId && (
        <div className="confirmDialogOverlay">
          <div className="confirmDialog">
            <div className="confirmDialogTitle">파일 제거</div>
            <div className="confirmDialogMessage">
              이 PDF 파일을 제거하시겠습니까?
              <br />
              파일과 관련된 모든 페이지가 삭제됩니다.
            </div>
            <div className="confirmDialogButtons">
              <button className="button" onClick={handleCancelRemove}>
                취소
              </button>
              <button className="primaryButton confirmRemoveButton" onClick={handleConfirmRemove}>
                제거
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

