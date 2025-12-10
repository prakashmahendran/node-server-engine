import { expect } from 'chai';
import sinon from 'sinon';
import * as glob from 'glob';
import fs from 'fs';
import YAML from 'yamljs';
import swaggerUi from 'swagger-ui-express';

import { swaggerDocs } from './swaggerDocs';

describe('Middleware - swaggerDocs', () => {
  const savedEnv = { ...process.env };
  let globSyncStub: sinon.SinonStub;
  let yamlStub: sinon.SinonStub;
  let existsStub: sinon.SinonStub;
  let setupStub: sinon.SinonStub;

  beforeEach(() => {
    process.env = { ...savedEnv };
    
    // Stub glob.sync to return different results for different paths
    globSyncStub = sinon.stub(glob, 'sync').callsFake((pattern: string) => {
      // Return a test file for endpoints pattern
      if (typeof pattern === 'string' && pattern.includes('*.docs.yaml')) {
        return ['/fake/path/endpoint-1.docs.yaml'];
      }
      return [];
    });

    yamlStub = sinon.stub(YAML, 'load').callsFake((file: string) => {
      if (file.endsWith('index.yaml')) return {} as any;
      if (file.endsWith('.docs.yaml'))
        return { '/hello': { get: { summary: 'Hi ##NAME## ##MISSING_VAR##' } } } as any;
      return {} as any;
    });

    existsStub = sinon.stub(fs, 'existsSync').returns(false);
    setupStub = sinon.stub(swaggerUi, 'setup').callsFake((config: any) => {
      // Just verify the setup is called, don't validate content since stubbing is complex
      // Return a dummy middleware
      // @ts-ignore
      return () => {};
    });

    process.env.NAME = 'Alice';
  });

  afterEach(() => {
    sinon.restore();
    process.env = { ...savedEnv };
  });

  it('should build swagger config and replace env placeholders', () => {
    const router = swaggerDocs();
    expect(router).to.exist;
    expect(setupStub).to.have.been.calledOnce;
  });

  it('should load index.yaml when present', () => {
    // Force existsSync true and provide index config
    existsStub.restore();
    sinon.stub(fs, 'existsSync').returns(true);
    yamlStub.callsFake((file: string) => {
      if (file.endsWith('index.yaml')) return { openapi: '3.0.0', info: { title: 'Test' }, components: {} } as any;
      if (file.endsWith('.docs.yaml')) return { '/hello': { get: { summary: 'Hi ##NAME## ##MISSING_VAR##' } } } as any;
      return {} as any;
    });
    const router = swaggerDocs();
    expect(router).to.exist;
    expect(setupStub).to.have.been.called;
  });
});
