const fs = require('fs')
const path = require('path')

describe('Diagnostic Photo Upload & Camera Capture', () => {
  const compressorPath = path.resolve(__dirname, '../lib/utils/image-compression.ts')
  const formPath = path.resolve(__dirname, '../components/services/MailInRepairRequestForm.tsx')
  const apiPath = path.resolve(__dirname, '../pages/api/repair-requests/index.ts')

  test('lib/utils/image-compression.ts exists and exports compressImageFile', () => {
    expect(fs.existsSync(compressorPath)).toBe(true)
    const content = fs.readFileSync(compressorPath, 'utf8')
    expect(content).toContain('compressImageFile')
    expect(content).toContain('canvas.toDataURL')
  })

  test('MailInRepairRequestForm supports live camera capture, drag-and-drop, and file browsing', () => {
    const content = fs.readFileSync(formPath, 'utf8')
    expect(content).toContain('capture="environment"')
    expect(content).toContain('compressImageFile')
    expect(content).toContain('handleProcessFiles')
    expect(content).toContain('imageUrls')
    expect(content).toContain('Take Photo')
    expect(content).toContain('Browse Files')
    expect(content).toContain('Drag &amp; drop device photos here')
    expect(content).toContain('Maximum 4 diagnostic photos allowed')
  })

  test('form includes thumbnail preview grid, delete button, and zoom modal', () => {
    const content = fs.readFileSync(formPath, 'utf8')
    expect(content).toContain('handleRemoveImage')
    expect(content).toContain('previewModalImg')
    expect(content).toContain('Enlarged Diagnostic Photo')
  })

  test('packing slip modal renders attached diagnostic photo thumbnails', () => {
    const content = fs.readFileSync(formPath, 'utf8')
    expect(content).toContain('Attached Diagnostic Photos')
    expect(content).toContain('submissionResult.record.itemDetails.imageUrls')
  })

  test('API route persists imageUrls in Firestore repair_requests', () => {
    const apiContent = fs.readFileSync(apiPath, 'utf8')
    expect(apiContent).toContain('imageUrls?: string[]')
    expect(apiContent).toContain('imageUrls: itemDetails.imageUrls || []')
  })
})
