import { PDFDocument } from 'pdf-lib'

export async function readFileBytes(file: File): Promise<Uint8Array> {
  console.log('readFileBytes called with file:', file.name, 'size:', file.size, 'type:', file.type)
  
  // 파일 크기 검증
  if (file.size === 0) {
    throw new Error(`파일이 비어 있습니다: ${file.name}`)
  }
  
  // 파일 타입 검증 (MIME 타입이 application/pdf가 아닌 경우 경고)
  if (file.type && file.type !== 'application/pdf') {
    console.warn(`파일 타입이 PDF가 아닙니다: ${file.type}`)
  }
  
  try {
    console.log('Calling file.arrayBuffer()...')
    const buf = await file.arrayBuffer()
    console.log('arrayBuffer result length:', buf.byteLength)
    
    // 중요: 즉시 복사본 만들기 (detached 방지)
    // buf.slice(0)을 사용하여 새로운 ArrayBuffer 생성
    const bytes = new Uint8Array(buf.slice(0))
    console.log('Uint8Array length:', bytes.length)
    
    // 바이트 길이 검증
    if (bytes.length === 0) {
      throw new Error(`파일을 읽을 수 없습니다: ${file.name}`)
    }
    
    // PDF 헤더 검증 (%PDF-)
    const header = String.fromCharCode(...bytes.slice(0, 5))
    console.log('PDF header:', header)
    
    if (!header.startsWith('%PDF-')) {
      throw new Error(`PDF 파일이 아닙니다: ${file.name} (헤더: ${header})`)
    }
    
    console.log('readFileBytes success, returning bytes of length:', bytes.length)
    return bytes
  } catch (error) {
    console.error('readFileBytes error:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error(`파일 읽기 실패: ${file.name}`)
  }
}

export async function getPdfPageCount(bytes: Uint8Array): Promise<number> {
  console.log('getPdfPageCount called with bytes length:', bytes.length)
  
  // bytes가 detached되었는지 확인
  if (bytes.length === 0) {
    throw new Error('Bytes are empty or detached')
  }
  
  // 중요: bytes.slice(0)으로 독립적인 복사본 만들기 (detached 방지)
  const bytesCopy = bytes.slice(0)
  
  // Note: encrypted PDFs will throw here in browser-only MVP.
  const doc = await PDFDocument.load(bytesCopy, { ignoreEncryption: true })
  return doc.getPageCount()
}

