// The one place that uploads and deletes images. Post photos, profile pictures and covers
// all go through here.
//
// Firebase loads only when an image is uploaded or deleted, so it isn't part of the first
// download. With REACT_APP_IMAGE_STORAGE=fake (used by the redesign's test copy), images stay
// in the browser instead and deletes are only recorded, so tests never touch real storage.
const FAKE = process.env.REACT_APP_IMAGE_STORAGE === 'fake'
const FOLDER = 'weConect'
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

async function firebaseStorage() {
  const [{ storage }, sdk] = await Promise.all([import('../firebase'), import('firebase/storage')])
  return { storage, ...sdk }
}

const readAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = () => reject(reader.error)
  reader.readAsDataURL(file)
})

// Uploads an image file and returns { url, filename }, the shape the API stores.
export async function uploadImage(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Choose an image file.')
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Choose an image smaller than 10 MB.')
  const filename = file.name + Date.now()
  if (FAKE) {
    window.__fakeImages = window.__fakeImages || { uploaded: [], deleted: [] }
    window.__fakeImages.uploaded.push(filename)
    return { url: await readAsDataUrl(file), filename }
  }
  const { storage, ref, uploadBytes, getDownloadURL } = await firebaseStorage()
  const snapshot = await uploadBytes(ref(storage, `${FOLDER}/${filename}`), file)
  return { url: await getDownloadURL(snapshot.ref), filename }
}

// Deletes a stored image. Does nothing without a filename: posts made without a photo have
// none, and deleting the folder path "weConect/" would fail.
export async function deleteImage(filename) {
  if (!filename) return
  if (FAKE) {
    window.__fakeImages = window.__fakeImages || { uploaded: [], deleted: [] }
    window.__fakeImages.deleted.push(filename)
    return
  }
  const { storage, ref, deleteObject } = await firebaseStorage()
  await deleteObject(ref(storage, `${FOLDER}/${filename}`))
}
