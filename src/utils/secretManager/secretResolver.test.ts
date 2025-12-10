import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getSecretOrFile } from './secretResolver';
import { secretCache } from './secretLoader';
import { EngineError } from 'entities/EngineError';

describe('Utils - secretManager - secretResolver', () => {
  const savedEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...savedEnv };
    Object.keys(secretCache).forEach((k) => delete secretCache[k]);
  });

  it('should read local file in development', () => {
    process.env.NODE_ENV = 'development';
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secret-'));
    const filePath = path.join(tmpDir, 'secret.txt');
    fs.writeFileSync(filePath, 'shhh');
    process.env.PRIVATE_KEY_PATH = filePath;
    const v = getSecretOrFile('PRIVATE_KEY_PATH');
    expect(v).to.equal('shhh');
  });

  it('should throw when local path is missing in development', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.PRIVATE_KEY_PATH;
    expect(() => getSecretOrFile('PRIVATE_KEY_PATH')).to.throw(EngineError);
  });

  it('should return cached secret in production', () => {
    process.env.NODE_ENV = 'production';
    secretCache.PRIVATE_KEY_PATH = 'prod-secret';
    const v = getSecretOrFile('PRIVATE_KEY_PATH');
    expect(v).to.equal('prod-secret');
  });

  it('should throw when secret not cached in production', () => {
    process.env.NODE_ENV = 'production';
    expect(() => getSecretOrFile('MISSING_SECRET')).to.throw(EngineError);
  });
});
