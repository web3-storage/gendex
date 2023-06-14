/* eslint-env browser */
/** @param {ReadableStream} readable */
export async function streamToBlob (readable) {
  const chunks = []
  await readable.pipeTo(new WritableStream({ write: chunk => { chunks.push(chunk) } }))
  return new Blob(chunks)
}
