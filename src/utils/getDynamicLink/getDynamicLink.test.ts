import { AxiosRequestConfig, AxiosResponse } from 'axios';
import chai, { expect } from 'chai';
import { faker } from '@faker-js/faker';
import { stub, SinonStub, match } from 'sinon';
import sinonChai from 'sinon-chai';
import { getDynamicLink } from './getDynamicLink';
import { DynamicLinkResponseBody } from './getDynamicLink.types';
import * as tlsRequest from 'utils/tlsRequest/tlsRequest';

chai.use(sinonChai);

describe('Utils - Get Dynamic Link', () => {
  let expectedPayload: AxiosRequestConfig;
  let path: string;
  let requestStub: SinonStub;
  let link: string;

  beforeEach(() => {
    link = faker.internet.url();
    requestStub = stub(tlsRequest, 'tlsRequest').resolves({
      data: { link }
    } as AxiosResponse<DynamicLinkResponseBody>);
    path = faker.system.directoryPath();
    expectedPayload = {
      method: 'get',
      url: '/link',
      baseURL: process.env.LINKS_SERVICE_URL,
      params: {
        path
      }
    };
  });

  it('should get a dynamic link', async () => {
    // should return a link from the res
    const dynamicLink = await getDynamicLink(path);
    expect(dynamicLink).to.equal(link);
    expect(requestStub).to.have.been.calledOnceWithExactly(
      match(expectedPayload)
    );
  });

  it('should get a dynamic link with custom settings', async () => {
    // should return a link from the res
    const dynamicLink = await getDynamicLink(path, { short: false });
    expect(dynamicLink).to.equal(link);
    expect(requestStub).to.have.been.calledOnceWithExactly(
      match({ ...expectedPayload, params: { path, short: false } })
    );
  });
});
