import { ErrorResponse } from './lib/errors.js'
import shard from './handlers/shard.js'
import block from './handlers/block.js'
import generateIndexes from './handlers/indexes-generate.js'
import writeIndexes from './handlers/indexes-write.js'

const Handlers = {
  PUT: {
    '/block/': block
  },
  POST: {
    '/indexes/generate': generateIndexes,
    '/indexes': writeIndexes,
    '/shard/': shard
  }
}

export default {
  /**
   * @param {Request} request
   * @param {import('./bindings').Env} env
   * @param {import('@cloudflare/workers-types').ExecutionContext} ctx
   */
  async fetch (request, env, ctx) {
    try {
      const handlers = Handlers[request.method]
      if (!handlers) return new ErrorResponse('method not allowed', 405)

      const url = new URL(request.url)
      for (const [path, handler] of Object.entries(handlers)) {
        if (url.pathname.startsWith(path)) {
          return await handler.fetch(request, env, ctx)
        }
      }

      return new ErrorResponse('not found', 404)
    } catch (err) {
      console.error(err)
      return new ErrorResponse(err.message, 500)
    }
  }
}
