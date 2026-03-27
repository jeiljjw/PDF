import * as pdfjs from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

export type PdfJsDocument = pdfjs.PDFDocumentProxy

let didInit = false
const docPromiseCache = new Map<string, Promise<PdfJsDocument>>()

export function initPdfJs() {
  if (didInit) return
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc
  didInit = true
}

export async function loadPdfForRender(args: {
  cacheKey: string
  bytes: Uint8Array
}): Promise<PdfJsDocument> {
  initPdfJs()
  const cached = docPromiseCache.get(args.cacheKey)
  if (cached) return await cached

  const promise = pdfjs.getDocument({ data: args.bytes }).promise
  docPromiseCache.set(args.cacheKey, promise)

  try {
    return await promise
  } catch (e) {
    docPromiseCache.delete(args.cacheKey)
    throw e
  }
}

export type RenderPageToCanvasArgs = {
  pdf: PdfJsDocument
  pageNumber: number
  canvas: HTMLCanvasElement
  scale: number
  rotation?: number
}

export async function renderPageToCanvas({
  pdf,
  pageNumber,
  canvas,
  scale,
  rotation = 0,
}: RenderPageToCanvasArgs): Promise<void> {
  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale, rotation })
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context is not available')

  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)

  await page.render({ canvasContext: ctx, viewport, canvas }).promise
}

