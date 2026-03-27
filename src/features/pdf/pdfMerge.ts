import { PDFDocument, degrees } from 'pdf-lib'
import type { PdfPageRef, PdfSource } from './pdfTypes'

export async function mergePdfByPages(args: {
  sources: PdfSource[]
  pages: PdfPageRef[]
  bytesMap: Map<string, Uint8Array>
}): Promise<Uint8Array> {
  const { sources, pages, bytesMap } = args
  const out = await PDFDocument.create()

  const sourceDocById = new Map<string, PDFDocument>()
  for (const s of sources) {
    try {
      // bytesMap에서 bytes 가져오기
      const bytes = bytesMap.get(s.id)
      if (!bytes) {
        throw new Error(`Bytes not found for source: ${s.fileName}`)
      }
      
      // bytes가 detached되었는지 확인
      if (bytes.length === 0) {
        throw new Error(`Bytes are empty or detached for source: ${s.fileName}`)
      }
      
      console.log(`Loading PDF: ${s.fileName}, bytes length: ${bytes.length}`)
      
      // 중요: bytes.slice(0)으로 독립적인 복사본 만들기 (detached 방지)
      const bytesCopy = bytes.slice(0)
      
      const doc = await PDFDocument.load(bytesCopy, { 
        ignoreEncryption: true,
        // 추가 옵션: 손상된 PDF도 로드 시도
        throwOnInvalidObject: false,
      })
      sourceDocById.set(s.id, doc)
    } catch (error) {
      console.error(`Failed to load PDF: ${s.fileName}`, error)
      const bytes = bytesMap.get(s.id)
      if (bytes) {
        console.error('PDF bytes length:', bytes.length)
      }
      throw new Error(`PDF 로드 실패: ${s.fileName} (${error instanceof Error ? error.message : 'Unknown error'})`)
    }
  }

  // Copy in the exact order requested.
  for (const p of pages) {
    const srcDoc = sourceDocById.get(p.sourceId)
    if (!srcDoc) throw new Error('Missing source document for merge')
    
    // 페이지 인덱스 유효성 검사
    if (p.pageIndex < 0 || p.pageIndex >= srcDoc.getPageCount()) {
      throw new Error(`Invalid page index: ${p.pageIndex} for document with ${srcDoc.getPageCount()} pages`)
    }
    
    try {
      const [copied] = await out.copyPages(srcDoc, [p.pageIndex])
      if (p.rotation) copied.setRotation(degrees(p.rotation))
      out.addPage(copied)
    } catch (error) {
      console.error(`Failed to copy page ${p.pageIndex} from ${srcDoc}`, error)
      throw new Error(`페이지 복사 실패: ${p.pageIndex + 1}페이지`)
    }
  }

  const bytes = await out.save()
  return bytes
}

