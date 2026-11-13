import { expect } from 'chai';
import { Request } from 'express';
import { checkSchema, Schema, validationResult } from 'express-validator';
import * as validators from './validators';

/** Run a schema against a request and return the failed fields and the sanitised request */
async function run(
  schema: Schema,
  request: { body?: unknown; query?: Record<string, unknown> }
): Promise<{ fields: Array<string>; req: Request }> {
  const req = {
    body: {},
    query: {},
    params: {},
    ...request
  } as unknown as Request;
  await Promise.all(checkSchema(schema).map((chain) => chain.run(req)));
  const fields = validationResult(req)
    .array()
    .map((e) => (e.type === 'field' ? e.path : e.type))
    .sort();
  return { fields, req };
}

describe('Utils - validators', () => {
  it('checks strings by type and length, trimming when asked', async () => {
    const schema = {
      name: validators.string('body', { min: 2, max: 5, trim: true })
    };
    expect((await run(schema, { body: { name: 5 } })).fields).to.deep.equal([
      'name'
    ]);
    expect(
      (await run(schema, { body: { name: 'abcdef' } })).fields
    ).to.deep.equal(['name']);
    const ok = await run(schema, { body: { name: '  ab  ' } });
    expect(ok.fields).to.deep.equal([]);
    expect((ok.req.body as { name: string }).name).to.equal('ab');
  });

  it('treats a JSON body number or boolean strictly', async () => {
    const schema = {
      n: validators.int('body', { min: 1, max: 10 }),
      b: validators.bool('body')
    };
    expect(
      (await run(schema, { body: { n: '5', b: 'true' } })).fields
    ).to.deep.equal(['b', 'n']);
    expect(
      (await run(schema, { body: { n: 5, b: false } })).fields
    ).to.deep.equal([]);
  });

  it('converts query numbers and applies defaults', async () => {
    const schema = validators.page({ maxPageSize: 50 });
    const r = await run(schema, { query: { pageSize: '20' } });
    expect(r.fields).to.deep.equal([]);
    expect(r.req.query).to.deep.equal({ page: 1, pageSize: 20 });
    expect(
      (await run(schema, { query: { pageSize: '51' } })).fields
    ).to.deep.equal(['pageSize']);
  });

  it('honours an extra integer check', async () => {
    const schema = {
      minutes: validators.int('body', {
        default: 0,
        check: (n) => n === 0 || n >= 5
      })
    };
    expect((await run(schema, { body: { minutes: 3 } })).fields).to.deep.equal([
      'minutes'
    ]);
    const r = await run(schema, { body: {} });
    expect((r.req.body as { minutes: number }).minutes).to.equal(0);
  });

  it('accepts ids, null when nullable and listed words', async () => {
    const id = '7f1f8f8e-5a2b-4c3d-9e0f-1a2b3c4d5e6f';
    const schema = {
      a: validators.uuid('body', { nullable: true }),
      b: validators.uuid('body', { orValues: ['none'] })
    };
    expect(
      (await run(schema, { body: { a: null, b: 'none' } })).fields
    ).to.deep.equal([]);
    expect(
      (await run(schema, { body: { a: 'x', b: id } })).fields
    ).to.deep.equal(['a']);
    expect(
      (await run(schema, { body: { a: id, b: 'all' } })).fields
    ).to.deep.equal(['b']);
  });

  it('normalises emails and checks lists, dates and times', async () => {
    const schema = {
      email: validators.email('body'),
      kind: validators.oneOf('body', ['a', 'b'], { default: 'a' }),
      day: validators.date('body'),
      at: validators.time('body', { nullable: true })
    };
    const r = await run(schema, {
      body: { email: ' Ann@Example.COM ', day: '2026-01-31' }
    });
    expect(r.fields).to.deep.equal([]);
    expect(r.req.body).to.deep.equal({
      email: 'ann@example.com',
      kind: 'a',
      day: '2026-01-31',
      at: null
    });
    const bad = await run(schema, {
      body: { email: 'x', kind: 'c', day: '2026-1-31', at: '24:00' }
    });
    expect(bad.fields).to.deep.equal(['at', 'day', 'email', 'kind']);
  });
});
