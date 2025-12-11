import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import { parseMessage } from './parseMessage';

describe('Entities - Socket Client - Utils - Parse Message', () => {
  it('should transform a JSON string into an object', () => {
    const object = { [faker.lorem.word()]: faker.lorem.word() };
    const result = parseMessage(JSON.stringify(object));
    expect(result).to.deep.equal(object);
  });

  it('should throw an error if the input is not parsable', () => {
    const object = faker.lorem.word();
    expect(() => parseMessage(JSON.stringify(object))).to.throw;
  });

  it('should throw an error if the input is not an object when parsed', () => {
    expect(() => parseMessage(JSON.stringify([faker.lorem.word()]))).to.throw;
  });

  it('should throw an error on malformed JSON', () => {
    expect(() => parseMessage('not valid json')).to.throw();
  });

  it('should throw an error on empty string', () => {
    expect(() => parseMessage('')).to.throw();
  });
});
