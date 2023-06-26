/* eslint-env browser */
/** @param {ReadableStream} readable */
export async function streamToBlob (readable) {
  const chunks = []
  await readable.pipeTo(new WritableStream({ write: chunk => { chunks.push(chunk) } }))
  return new Blob(chunks)
}

/** @param {ReadableStream} readable */
export async function streamToBytes (readable) {
  return new Uint8Array(await (await streamToBlob(readable)).arrayBuffer())
}

/** @param {AsyncIterator} iterator */
export function iteratorToStream (iterator) {
  return new ReadableStream({
    async pull (controller) {
      const { value, done } = await iterator.next()
      if (done) {
        controller.close()
      } else {
        controller.enqueue(value)
      }
    }
  })
}
