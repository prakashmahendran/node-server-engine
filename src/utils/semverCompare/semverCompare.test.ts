import { expect } from 'chai';
import { semverCompare } from './semverCompare';
import { EngineError } from 'entities/EngineError';

describe('Utils - SemVer Compare', function () {
  it('Should throw an error if given a wrong formatted item', () => {
    expect(() => semverCompare('1.0.0', 'test')).to.throw(EngineError);
    expect(() => semverCompare('wrong', '1.0.0')).to.throw(EngineError);
  });

  it('Should compare majors', () => {
    expect(semverCompare('1.0.0', '2.0.0')).to.equal(-1);
    expect(semverCompare('2.0.0', '1.0.0')).to.equal(1);
  });

  it('Should compare minors', () => {
    expect(semverCompare('1.1.0', '1.2.0')).to.equal(-1);
    expect(semverCompare('2.5.0', '2.3.0')).to.equal(1);
  });

  it('Should compare patches', () => {
    expect(semverCompare('1.1.1', '1.1.2')).to.equal(-1);
    expect(semverCompare('2.5.6', '2.5.0')).to.equal(1);
  });

  it('Should compare patches', () => {
    expect(semverCompare('1.1.1', '1.1.2')).to.equal(-1);
    expect(semverCompare('2.5.6', '2.5.0')).to.equal(1);
  });

  it('Should compare releases types', () => {
    expect(semverCompare('1.1.1-rc.1', '1.1.1')).to.equal(-1);
    expect(semverCompare('1.1.1-beta.1', '1.1.1-rc.1')).to.equal(-1);
    expect(semverCompare('1.1.1-alpha.1', '1.1.1-beta.1')).to.equal(-1);
    expect(semverCompare('2.5.5', '2.5.5-rc.1')).to.equal(1);
    expect(semverCompare('2.5.5-rc.1', '2.5.5-beta.1')).to.equal(1);
    expect(semverCompare('2.5.5-beta.1', '2.5.5-alpha.1')).to.equal(1);
  });

  it('Should compare pre-release versions', () => {
    expect(semverCompare('1.1.1-alpha.1', '1.1.1-alpha.2')).to.equal(-1);
    expect(semverCompare('2.5.6-rc.5', '2.5.6-rc.3')).to.equal(1);
  });

  it('Should handle equality', () => {
    expect(semverCompare('1.1.1', '1.1.1')).to.equal(0);
    expect(semverCompare('2.5.6-rc.5', '2.5.6-rc.5')).to.equal(0);
  });
});
