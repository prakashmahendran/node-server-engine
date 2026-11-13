import { expect } from 'chai';
import { globPattern } from './globPattern';

describe('Utils - globPattern', () => {
  it('turns Windows paths into forward slashes', () => {
    expect(globPattern('C:\\app\\dist\\db\\migrations', '*.js')).to.equal(
      'C:/app/dist/db/migrations/*.js'
    );
  });

  it('leaves POSIX paths alone and drops a trailing slash', () => {
    expect(globPattern('/srv/app/src/', '**/*.docs.yaml')).to.equal(
      '/srv/app/src/**/*.docs.yaml'
    );
  });
});
