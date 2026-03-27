export type MergeBarProps = {
  canMerge: boolean
  busy: boolean
  outputName: string
  onChangeOutputName: (name: string) => void
  onMergeDownload: () => void
  canEditPage: boolean
  canUndo: boolean
  onDeletePage: () => void
  onUndo: () => void
  onRotateLeft: () => void
  onRotateRight: () => void
}

export function MergeBar({
  canMerge,
  busy,
  outputName,
  onChangeOutputName,
  onMergeDownload,
  canEditPage,
  canUndo,
  onDeletePage,
  onUndo,
  onRotateLeft,
  onRotateRight,
}: MergeBarProps) {
  return (
    <div className="mergeBar">
      <div className="mergeBarLeft">
        <div className="mergeBarTitle">작업</div>
        <div className="mergeBarHint">오른쪽 페이지 순서대로 새 PDF를 생성합니다.</div>
      </div>

      <div className="mergeBarRight">
        <div className="mergeTools">
          <button className="button" onClick={onRotateLeft} disabled={!canEditPage}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.5 2v6h6M2.66 15.57a10 10 0 1 0 .57-8.38"/>
            </svg>
          </button>
          <button className="button" onClick={onRotateRight} disabled={!canEditPage}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"/>
            </svg>
          </button>
          <button className="button" onClick={onDeletePage} disabled={!canEditPage}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
          <button className="button" onClick={onUndo} disabled={!canUndo}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7v6h6M3 13a9 9 0 1 0 2.636-6.364L3 7"/>
            </svg>
          </button>
        </div>
        <input
          className="textInput"
          value={outputName}
          onChange={(e) => onChangeOutputName(e.target.value)}
          disabled={busy}
          aria-label="Output filename"
        />
        <button className="primaryButton" onClick={onMergeDownload} disabled={!canMerge || busy}>
          {busy ? (
            <>
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              처리중…
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              병합 다운로드
            </>
          )}
        </button>
      </div>
    </div>
  )
}

