/**
 * Client-side utility for compressing image files to optimized Base64 JPEG data URLs
 * to ensure ultra-fast uploads and keep Firestore documents compact.
 */
export async function compressImageFile(
  file: File,
  maxDimension = 1200,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Image compression must run in browser'))
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.onload = (event) => {
      const img = new Image()
      img.onerror = () => reject(new Error('Failed to load image data'))
      img.onload = () => {
        let width = img.width
        let height = img.height

        // Maintain aspect ratio while bounding within maxDimension
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          return reject(new Error('Failed to obtain canvas 2D context'))
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height)

        // Export as compressed JPEG data URL
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(dataUrl)
      }
      img.src = event.target?.result as string
    }

    reader.readAsDataURL(file)
  })
}
