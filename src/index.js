import { ErrorResponse } from './lib/errors.js'
import shard from './handlers/shard.js'
import blocks from './handlers/blocks.js'

const Handlers = {
  '/shard': shard,
  '/blocks': blocks
}

export default {
  /**
   * @param {Request} request
   * @param {import('./bindings').Env} env
   * @param {unknown} ctx
   */
  async fetch (request, env, ctx) {
    try {
      if (request.method !== 'POST') {
        return new ErrorResponse('method not allowed', 405)
      }
      const url = new URL(request.url)
      for (const [path, handler] of Object.entries(Handlers)) {
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
