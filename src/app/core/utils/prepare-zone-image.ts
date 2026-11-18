const MAX_EDGE = 2000;
const TARGET_BYTES = 6 * 1024 * 1024;

/** Baja la foto en el navegador para que la petición no supere el límite del servidor. */
export async function prepareZoneImage(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }
  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    if (longest <= MAX_EDGE && file.size <= TARGET_BYTES) return file;
    const scale = Math.min(1, MAX_EDGE / longest);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    let quality = 0.85;
    let blob: Blob | null = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((value) => resolve(value), 'image/jpeg', quality);
      });
      if (!blob || blob.size <= TARGET_BYTES) break;
      quality -= 0.15;
    }
    if (!blob) return file;
    const base = file.name.replace(/\.[^.]+$/, '') || 'zona';
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
  } finally {
    bitmap.close();
  }
}
