import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import { describe, it, beforeEach } from 'mocha';
import { stub, match } from 'sinon';
import * as output from './output';
import {
  reportInfo,
  reportDebug,
  reportError,
  resetNamespaceSelector
} from './report';
import { EngineError } from 'entities/EngineError';
import { WebError } from 'entities/WebError';
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

  describe('Report Error', () => {
    const REPORTED =
      'type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent';

    it('marks engine errors and 5xx web errors for Error Reporting', () => {
      expect(
        reportError(new EngineError({ message: 'boom' }))['@type']
      ).to.equal(REPORTED);
      expect(
        reportError(new WebError({ errorCode: 'x', statusCode: 500 }))['@type']
      ).to.equal(REPORTED);
    });

    it('leaves out 4xx web errors and a 5xx that is not reportable', () => {
      expect(
        reportError(new WebError({ errorCode: 'x', statusCode: 401 }))['@type']
      ).to.equal(undefined);
      expect(
        reportError(
          new WebError({
            errorCode: 'busy',
            statusCode: 503,
            reportable: false
          })
        )['@type']
      ).to.equal(undefined);
    });
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
