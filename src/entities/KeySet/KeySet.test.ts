import { randomUUID, createPublicKey } from 'crypto';
import { readFileSync } from 'fs';
import { readFile } from 'fs/promises';
import { AxiosResponse } from 'axios';
import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import { stub, SinonStub } from 'sinon';
import { KeySet } from './KeySet';
import { JWKS } from './KeySet.types';
import * as request from 'utils/request/request';
import * as tlsRequest from 'utils/tlsRequest/tlsRequest';

// We test with both an RSA key and an EC key
const TEST_JWKS = {
  data: {
    keys: [
      {
        alg: 'RS256',
        kty: 'RSA',
        use: 'sig',
        n:
          'u18mjw63ELk8xA4C2Qbi1WTtqcx853iRv9Gfd-zKKmlU2wStnOGnIfnHkrNbl5y8vTMNBKNuqLh3Y_el' +
          'PVSUIWGcy3KByw7VRnBTAze2bsmI0Dvz-89Ar1C2g0Ui6DOYyEa0iiXer4gSQgJ5ddsbIAMJMBT5j96G' +
          '1mhbjM2mqekORRyjCZHGeNbofnTvKcJRTStsBPXQ2WEkAf6J1eNZ2-QnNYMVVO44-KXfhQsfaqRoporj' +
          '4LvTkNX0kkxyfC3V1R8Qrk-_pHhzPtKtQxiRj2axTVXFoj5I1Po7WgQz2_vBZnWZ-0AIzHXN6F_fmMhy' +
          'PBPk3pbuN7cHBe2cKh_nHQ',
        e: 'AQAB',
        kid: 'Q0ZCQzEwRTFCOUE3QjI0MUZEREQ0N0I4MTI3OTVFRDkyNTIxQjQ3MA'
      },
      {
        crv: 'P-256',
        kty: 'EC',
        x: 'ruky13qVa2GM9jnWsBYP_OTsk6fyV_HWC2AjvUkyCv8',
        y: 'kIAW58dw6pjO1dy4czpNdsaL8DUc3RKo6Hmses5O_Bc',
        kid: '3d-GYUhTwkAfCi9JdvMieQ',
        alg: 'EC256',
        use: 'sig'
      }
    ]
  }
};

const TEST_PEMS = TEST_JWKS.data.keys.map((key) =>
  createPublicKey({ key, format: 'jwk' }).export({
    format: 'pem',
    type: 'spki'
  })
);

describe('Entity - KeySet', function () {
  let url: string;
  let requestStub: SinonStub;
  let tlsRequestStub: SinonStub;

  beforeEach(() => {
    url = faker.internet.url();

    requestStub = stub(request, 'request').resolves(
      TEST_JWKS as unknown as AxiosResponse<JWKS>
    );
    tlsRequestStub = stub(tlsRequest, 'tlsRequest').resolves(
      TEST_JWKS as unknown as AxiosResponse<JWKS>
    );
  });

  it('should create a key set when fetching', async () => {
    const keySet = new KeySet(url);
    await keySet.init();

    const keys = keySet.getKeys();
    expect(Object.values(keys)).to.have.length(2);
    Object.values(keys).forEach((key) => {
      expect(TEST_PEMS).to.include(key);
    });
  });

  it('should make a regular request by default', async () => {
    const keySet = new KeySet(url);

    await keySet.init();

    expect(requestStub).to.have.been.calledOnceWithExactly({
      url,
      method: 'get'
    });
    expect(tlsRequestStub).to.not.have.been.called;
  });

  it('should make a TLS request for internal keysets', async () => {
    const keySet = new KeySet(url, { internal: true });

    await keySet.init();

    expect(tlsRequestStub).to.have.been.calledOnceWithExactly({
      url,
      method: 'get'
    });
    expect(requestStub).to.not.have.been.called;
  });

  it('should read a key from a PEM string', async () => {
    const pem = await readFile(
      process.env.ECDSA_PUBLIC_KEY as string,
      'utf-8'
    );

    const keySet = new KeySet(pem, { pem: true });

    await keySet.init();

    expect(tlsRequestStub).to.not.have.been.called;
    expect(requestStub).to.not.have.been.called;
    expect(Object.keys(keySet.getKeys())).to.have.length(1);
    for (const key of Object.values(keySet.getKeys())) {
      expect(key).to.equal(pem);
    }
  });

  it('should not fail if the init did not complete and a key is asked', () => {
    const keySet = new KeySet(faker.internet.url());

    const result = keySet.getKey(randomUUID());

    expect(result).to.be.undefined;
  });
});
