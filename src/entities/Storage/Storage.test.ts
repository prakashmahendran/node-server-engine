import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import validator from 'validator';
import { Storage } from './Storage';

describe('Storage', function () {
  it('should generate path info for a regular file', function () {
    const path = Storage.generateFileDestination();
    // eslint-disable-next-line import/no-named-as-default-member
    expect(validator.isUUID(path)).to.be.true;
  });

  it('should add a path to a file', function () {
    const directory = `${faker.lorem.word()}`;
    const path = Storage.generateFileDestination({
      directory
    });

    expect(path.startsWith(directory)).to.be.true;
  });

  it('should add a path to a file but remove appended slash', function () {
    const directory = `${faker.lorem.word()}`;
    const path = Storage.generateFileDestination({
      directory: '/' + directory
    });
    expect(path.startsWith(directory)).to.be.true;
  });

  it('should not append an extension if specified', function () {
    const directory = `${faker.lorem.word()}`;
    const mimeType = 'image/png';
    const path = Storage.generateFileDestination({
      directory,
      mime: mimeType,
      noExtension: true
    });

    const resultExt = path.split('.')[1];

    expect(path.startsWith(directory)).to.be.true;
    expect(resultExt).to.be.undefined;
  });

  it('should append an extension if specified', function () {
    const directory = `${faker.lorem.word()}`;
    const mimeType = 'image/png';
    const path = Storage.generateFileDestination({
      directory,
      mime: mimeType
    });

    const resultExt = path.split('.')[1];

    expect(path.startsWith(directory)).to.be.true;
    expect(resultExt).to.equal('png');
  });
});
