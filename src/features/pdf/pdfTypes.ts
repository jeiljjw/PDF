export type PdfSourceId = string
export type PdfPageId = string

export type PdfSource = {
  id: PdfSourceId
  file: File
  fileName: string
  size: number
  pageCount: number
}

export type PdfPageRef = {
  id: PdfPageId
  sourceId: PdfSourceId
  pageIndex: number // 0-based within source
  rotation: 0 | 90 | 180 | 270
}

export type AppError = {
  id: string
  message: string
}

