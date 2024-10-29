import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import { trimPathSlash } from './trimPathSlash';

describe('Trim Path Slash', function () {
  it('should remove starting slash', function () {
    const result = trimPathSlash(`/${faker.lorem.word()}`);
    expect(result[0]).to.not.equal('/');
  });

  it('should remove ending slash', function () {
    const result = trimPathSlash(`${faker.lorem.word()}/`);
    expect(result[result.length]).to.not.equal('/');
  });

  it('should remove both slash', function () {
    const result = trimPathSlash(`/${faker.lorem.word()}/`);
    expect(result[0]).to.not.equal('/');
    expect(result[result.length]).to.not.equal('/');
  });

  it('should preserve slash in the string', function () {
    const result = trimPathSlash(`${faker.lorem.word()}/${faker.lorem.word()}`);
    expect(result).to.include('/');
  });
});
