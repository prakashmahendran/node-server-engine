import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import { createSortedObject } from './createSortedObject';

describe('Utils - createSortedObject', () => {
  it('should sort an object', () => {
    const object: { [key: string]: string } = {};
    for (let i = 0; i < 20; i++) {
      object[faker.lorem.word()] = faker.lorem.word();
    }
    const sorted = createSortedObject(object);
    const expectedKeys = Object.keys(object).sort();
    const sortedKeys = Object.keys(sorted);

    expectedKeys.forEach((value, index) => {
      expect(value).to.equal(sortedKeys[index]);
    });
  });

  it('should deeply sort an object', () => {
    const object: {
      /** */
      x: { [key: string]: string };
    } = { x: {} };
    for (let i = 0; i < 20; i++) {
      object.x[faker.lorem.word()] = faker.lorem.word();
    }
    const sorted = createSortedObject(object);
    const expectedKeys = Object.keys(object.x).sort();
    const sortedKeys = Object.keys(sorted.x);

    expectedKeys.forEach((value, index) => {
      expect(value).to.equal(sortedKeys[index]);
    });
  });

  it('should handle null values', () => {
    const object = { a: null };
    expect(() => createSortedObject(object)).to.not.throw();
  });

  it('should not sort arrays', () => {
    const object = { a: ['z', 'a', 'o', 'd'] };
    const sorted = createSortedObject(object);
    expect(object).to.deep.equal(sorted);
  });
});
