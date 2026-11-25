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

  it('is reportable for a 5xx and not for a 4xx, unless told otherwise', () => {
    expect(
      new WebError({ errorCode: 'a', statusCode: 500 }).reportable
    ).to.equal(true);
    expect(
      new WebError({ errorCode: 'a', statusCode: 404 }).reportable
    ).to.equal(false);
    expect(new WebError({ errorCode: 'a' }).reportable).to.equal(false);
    expect(
      new WebError({ errorCode: 'busy', statusCode: 503, reportable: false })
        .reportable
    ).to.equal(false);
    expect(
      new WebError({ errorCode: 'a', statusCode: 409, reportable: true })
        .reportable
    ).to.equal(true);
  });
});
