import { expect } from 'chai';
import { filter } from './filter';

describe('Utils - filter', () => {
  it('should filter object with whitelist keys', () => {
    const obj = { a: 1, b: 2, c: 3, d: 4 };
    const result = filter(obj, ['a', 'c']);
    
    expect(result).to.deep.equal({ a: 1, c: 3 });
  });

  it('should return empty object when whitelist is empty', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = filter(obj, []);
    
    expect(result).to.deep.equal({});
  });

  it('should return empty object when no keys match', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = filter(obj, ['x', 'y', 'z']);
    
    expect(result).to.deep.equal({});
  });

  it('should handle object with different value types', () => {
    const obj = { 
      name: 'test', 
      count: 42, 
      active: true, 
      data: { nested: 'value' },
      items: [1, 2, 3]
    };
    const result = filter(obj, ['name', 'active', 'items']);
    
    expect(result).to.deep.equal({ 
      name: 'test', 
      active: true, 
      items: [1, 2, 3]
    });
  });

  it('should preserve null and undefined values', () => {
    const obj = { a: null, b: undefined, c: 'value' };
    const result = filter(obj, ['a', 'b', 'c']);
    
    expect(result.a).to.be.null;
    expect(result.b).to.be.undefined;
    expect(result.c).to.equal('value');
  });

  it('should return all keys when all are in whitelist', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = filter(obj, ['a', 'b', 'c']);
    
    expect(result).to.deep.equal(obj);
  });

  it('should not modify original object', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const original = { ...obj };
    filter(obj, ['a']);
    
    expect(obj).to.deep.equal(original);
  });

  it('should handle empty object', () => {
    const obj = {};
    const result = filter(obj, ['a', 'b']);
    
    expect(result).to.deep.equal({});
  });

  it('should ignore whitelist keys that dont exist', () => {
    const obj = { a: 1, b: 2 };
    const result = filter(obj, ['a', 'b', 'c', 'd']);
    
    expect(result).to.deep.equal({ a: 1, b: 2 });
  });

  it('should handle numeric keys', () => {
    const obj: Record<string, unknown> = { '0': 'zero', '1': 'one', 'a': 'letter' };
    const result = filter(obj, ['0', 'a']);
    
    expect(result).to.deep.equal({ '0': 'zero', 'a': 'letter' });
  });
});
