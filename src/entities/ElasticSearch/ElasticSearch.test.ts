import { expect } from 'chai';
import sinon from 'sinon';
import mockRequire from 'mock-require';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Fake ElasticSearch Client to avoid real network calls
class FakeESClient {
  public static lastConfig: any;
  public indices: any;
  public ping: sinon.SinonStub;
  public search: sinon.SinonStub;
  public index: sinon.SinonStub;
  public close: sinon.SinonStub;

  constructor(config: any) {
    FakeESClient.lastConfig = config;
    this.indices = {
      delete: sinon.stub().resolves(),
      exists: sinon.stub().resolves(true)
    };
    this.ping = sinon.stub().resolves();
    this.search = sinon.stub().resolves({ hits: { total: { value: 0 } } });
    this.index = sinon.stub().resolves();
    this.close = sinon.stub().resolves();
  }
}

describe('Entity - ElasticSearch', () => {
  // Debug marker to ensure test file loads
  // eslint-disable-next-line no-console
  console.log('[ElasticSearch.test] loaded');
  const savedEnv = { ...process.env };
  let tmpDir: string;

  beforeEach(() => {
    process.env = { ...savedEnv };
    // Create temp migration directory
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'es-migrations-'));
    process.env.ELASTIC_SEARCH_HOST = 'http://localhost:9200';
    process.env.ELASTIC_SEARCH_USERNAME = 'user';
    process.env.ELASTIC_SEARCH_PASSWORD = 'pass';
    process.env.ELASTIC_SEARCH_MIGRATION_PATH = tmpDir;
    process.env.NODE_ENV = 'test';
    // Mock the elastic client module before importing the entity
    mockRequire('@elastic/elasticsearch', { Client: FakeESClient as any });
    // Prevent checkEnvironment from exiting the process during tests
    mockRequire('utils/checkEnvironment', {
      checkEnvironment: () => {},
      assertEnvironment: () => {}
    });
  });

  afterEach(() => {
    mockRequire.stopAll();
    sinon.restore();
    process.env = { ...savedEnv };
  });

  function requireElastic() {
    // Ensure a fresh copy after mocks
    delete (require as any).cache[(require as any).resolve('./ElasticSearch')];
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('./ElasticSearch');
    return mod.ElasticSearch as typeof import('./ElasticSearch').ElasticSearch;
  }

  it('should throw when ELASTIC_SEARCH_HOST is missing', async () => {
    // eslint-disable-next-line no-console
    console.log('[ElasticSearch.test] starting first test');
    delete process.env.ELASTIC_SEARCH_HOST;
    const ElasticSearch = requireElastic();
    try {
      await ElasticSearch.init();
      expect.fail('Expected init to throw');
    } catch (err: any) {
      expect(String(err?.message || err)).to.contain('ElasticSearch Host not set in environment');
    }
  });

  it('should init with TLS when TLS_CA is provided and run migrations', async () => {
    // Write a simple JS migration file into tmp dir
    const migFile = path.join(tmpDir, '001-init.js');
    fs.writeFileSync(
      migFile,
      'module.exports.migrate = async function(){ return; };'
    );

    process.env.TLS_CA = 'CA_CERT_CONTENT';

    const ElasticSearch = requireElastic();
    await ElasticSearch.init();

    // TLS should be enabled in the config passed to the client
    expect(FakeESClient.lastConfig).to.have.property('tls');
    // In test env, indices.delete should have been called to flush
    expect((ElasticSearch.getClient() as any).indices.delete).to.have.been.called;

    // Shutdown should close the client gracefully
    await ElasticSearch.shutdown();
  });

  it('should skip already ran migrations', async () => {
    // Prepare two migration files
    fs.writeFileSync(path.join(tmpDir, '001-a.js'), 'module.exports.migrate = async function(){};');
    fs.writeFileSync(path.join(tmpDir, '002-b.js'), 'module.exports.migrate = async function(){};');

    // Mock search to return a hit for the first file so it is skipped
    const ElasticSearch = requireElastic();

    // Init and get client
    await ElasticSearch.init();
    const client: any = ElasticSearch.getClient();
    // Force exists to return true
    client.indices.exists.resolves(true);
    // First call returns total=1 (skip), second returns total=0 (run)
    const searchStub = client.search as sinon.SinonStub;
    searchStub.onCall(0).resolves({ hits: { total: { value: 1 } } } as any);
    searchStub.onCall(1).resolves({ hits: { total: { value: 0 } } } as any);

    await ElasticSearch.migrate();

    // First skipped, second should have been indexed as ran
    expect(client.index).to.have.been.calledWithMatch({ index: 'migrations' });

    await ElasticSearch.shutdown();
  });

  it('should throw EngineError when migration directory cannot be read', async () => {
    // Point to a non-existent directory to trigger fs error on readdirSync
    process.env.ELASTIC_SEARCH_MIGRATION_PATH = path.join(os.tmpdir(), 'non-existent-dir-zzz');
    const ElasticSearch = requireElastic();
    try {
      await ElasticSearch.init();
      expect.fail('Expected init to throw');
    } catch (err: any) {
      expect(String(err?.message || err)).to.contain('Failed to read migration directory');
    }
  });

  it('should raise EngineError when connection ping fails', async () => {
    // Re-mock elasticsearch Client with ping failing
    mockRequire.stopAll();
    class FailingPingClient extends FakeESClient {
      constructor(config: any) {
        super(config);
        this.ping.rejects(new Error('no conn'));
      }
    }
    mockRequire('@elastic/elasticsearch', { Client: FailingPingClient as any });
    const ElasticSearch = requireElastic();
    try {
      await ElasticSearch.init();
      expect.fail('Expected init to throw');
    } catch (err: any) {
      expect(String(err?.message || err)).to.contain('Failed to connect to ElasticSearch');
    }
  });
});
