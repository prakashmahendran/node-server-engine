import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import { describe, it, beforeEach } from 'mocha';
import { stub, match } from 'sinon';
import * as output from './output';
import { reportInfo, reportDebug, resetNamespaceSelector } from './report';
import { InfoLogEntry } from './report.types';

describe('Utils - Report', () => {
  it('should collect filename and line number', () => {
    let result = reportInfo('example');
    expect(result.fileName).to.equal(
      `${__dirname}/report.test.ts`.replace(/.*src\//, 'src/')
    );
    expect(result.severity).to.equal('INFO');
    expect(result.message).to.equal('example');

    const data: InfoLogEntry = { message: 'world' };
    result = reportInfo(data);
    expect(result.message).to.equal('world');
    expect(result.fileName).to.equal(
      `${__dirname}/report.test.ts`.replace(/.*src\//, 'src/')
    );
  });

  describe('Report Debug', () => {
    let globalNamespace: string;

    beforeEach(() => {
      resetNamespaceSelector();

      globalNamespace = faker.lorem.slug();
      reportDebug.setNameSpace(globalNamespace);
    });

    afterEach(() => {
      reportDebug.clearNamespace();
    });

    it('should report when the namespace is specified', () => {
      const namespace = faker.lorem.word();
      process.env.DEBUG = globalNamespace + ':' + namespace;
      const outputStub = stub(output, 'output');
      const message = faker.lorem.sentence();
      reportDebug({ message, namespace });
      expect(outputStub).to.have.been.calledOnceWithExactly(
        match({
          message: `[${namespace}] ${message}`,
          severity: 'DEBUG',
          namespace: namespace
        })
      );
    });

    it('should report when the namespace is specified with a wildcard', () => {
      const namespace = faker.lorem.word();
      process.env.DEBUG = globalNamespace + ':' + `${namespace}:*`;
      const outputStub = stub(output, 'output');
      const message = faker.lorem.sentence();
      const prefix = faker.lorem.word();
      const actualNamespace = `${namespace}:${prefix}`;
      reportDebug({ message, namespace: actualNamespace });
      expect(outputStub).to.have.been.calledOnceWithExactly(
        match({
          message: `[${prefix}] ${message}`,
          severity: 'DEBUG',
          namespace: actualNamespace
        })
      );
    });

    it('should report when multiple namespaces are specified', () => {
      const namespace = faker.lorem.word();
      process.env.DEBUG =
        globalNamespace +
        ':' +
        `${namespace},${faker.lorem.word()},${faker.lorem.word()}`;
      const outputStub = stub(output, 'output');
      const message = faker.lorem.sentence();
      reportDebug({ message, namespace });
      expect(outputStub).to.have.been.calledOnceWithExactly(
        match({
          message: `[${namespace}] ${message}`,
          severity: 'DEBUG',
          namespace: namespace
        })
      );
    });

    it('should not report when another namespace is specified', () => {
      process.env.DEBUG = faker.lorem.word();
      const outputStub = stub(output, 'output');
      reportDebug({
        message: faker.lorem.sentence(),
        namespace: faker.lorem.word()
      });
      expect(outputStub).to.not.have.been.called;
    });

    it('should ignore the global namespace in server engine report debug', () => {
      const namespace = 'engine';
      process.env.DEBUG = `${namespace}:*`;
      const prefix = faker.lorem.word();
      const actualNamespace = `${namespace}:${prefix}`;
      const outputStub = stub(output, 'output');
      const message = faker.lorem.sentence();
      reportDebug({ message, namespace: actualNamespace });
      expect(outputStub).to.have.been.calledOnceWithExactly(
        match({
          message: `[${prefix}] ${message}`,
          severity: 'DEBUG',
          namespace: actualNamespace
        })
      );
    });

    it('should report with no global namespace', () => {
      reportDebug.clearNamespace();
      const namespace = faker.lorem.word();
      process.env.DEBUG = namespace;
      const outputStub = stub(output, 'output');
      const message = faker.lorem.sentence();
      reportDebug({ message, namespace });
      expect(outputStub).to.have.been.calledOnceWithExactly(
        match({
          message: `[${namespace}] ${message}`,
          severity: 'DEBUG',
          namespace
        })
      );
    });
  });
});
