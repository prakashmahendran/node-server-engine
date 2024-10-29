import { expect } from 'chai';
import { WebError } from './WebError';

describe('Entity - WebError', () => {
  it('should set the error code and message', () => {
    const statusCode = 401;
    const errorCode = 'example-errorCode';
    const message = 'this is an example message';
    const error = new WebError({
      message,
      errorCode,
      statusCode
    });
    expect(error.message).to.equal(message);
    expect(error.errorCode).to.equal(errorCode);
    expect(error.statusCode).to.equal(statusCode);
  });
});
