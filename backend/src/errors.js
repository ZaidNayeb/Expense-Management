// An error whose message is safe to show to the client.
export class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export const notFound = (what = 'Resource') => new HttpError(404, `${what} not found.`);
export const validationError = (fields) =>
  new HttpError(422, 'Please correct the highlighted fields.', fields);
