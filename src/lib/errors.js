import { encode } from '@ipld/dag-json'

export class ErrorResponse extends Response {
  /**
   * @param {string} message
   * @param {number} status
   */
  constructor (message, status) {
    super(encode({ error: message }), { status, headers: { 'Content-Type': 'application/json' } })
  }
}
