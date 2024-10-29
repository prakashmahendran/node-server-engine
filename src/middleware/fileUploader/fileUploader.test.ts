import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import { setTimeout as setTimeoutAsync } from 'timers/promises';
import axios from 'axios';
import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import FormData from 'form-data';
import { Sequelize } from 'sequelize';
import { stub, SinonStub } from 'sinon';
import request from 'supertest';
import { EndpointAuthType, EndpointMethod, Endpoint } from 'entities/Endpoint';
import { Server } from 'entities/Server';
import { stubPubSub, stubStorage, createTestApp } from 'test';

const PATH = '/test';
const buffer = Buffer.from(faker.lorem.paragraphs());
let uploadStub: SinonStub;
let deleteStub: SinonStub;
let bucket: string;

describe('Middleware - File Uploader', () => {
  beforeEach(() => {
    const { upload, remove } = stubStorage();
    uploadStub = upload;
    deleteStub = remove;
    stub(Sequelize.prototype, 'close');
    stubPubSub();
    bucket = faker.lorem.slug();
  });

  it('should throw an error for multipart requests', async () => {
    const key = faker.lorem.word();
    const app = createTestApp({ path: PATH, file: { bucket, key } });
    await request(app)
      .post(PATH)
      .set('Content-Type', 'application/json')
      .expect(415, { errorCode: 'invalid-content-type' });
    expect(uploadStub).to.not.have.been.called;
  });

  // it('should throw an error for unknown file fields', async () => {
  //   const key = faker.lorem.words();
  //   const app = createTestApp({
  //     path: PATH,
  //     file: { bucket, key: faker.lorem.word() }
  //   });
  //   await request(app)
  //     .post(PATH)
  //     .attach(key, buffer, faker.system.fileName())
  //     .expect(400, { errorCode: 'invalid-file-field', hint: { field: key } });
  //   expect(uploadStub).to.not.have.been.called;
  // });

  // it('should throw an error for a file with an unexpected mime type', async () => {
  //   const key = faker.lorem.word();
  //   const app = createTestApp({
  //     path: PATH,
  //     file: { bucket, key, mimeTypes: [faker.lorem.word()] }
  //   });
  //   await request(app)
  //     .post(PATH)
  //     .attach(key, buffer, faker.system.fileName())
  //     .expect(415, { errorCode: 'invalid-mime-type', hint: { field: key } });
  //   expect(uploadStub).to.not.have.been.called;
  // });

  // it('should upload a single file', async () => {
  //   const key = faker.lorem.word();
  //   const app = createTestApp({ path: PATH, file: { bucket, key } });
  //   await request(app)
  //     .post(PATH)
  //     .attach(key, buffer, faker.system.fileName())
  //     .expect(200);
  //   expect(uploadStub).to.have.been.calledOnce;
  // });

  // it('should upload multiple files', async () => {
  //   const key1 = faker.lorem.word();
  //   const key2 = faker.lorem.word();
  //   const app = createTestApp({
  //     path: PATH,
  //     files: [
  //       { bucket, key: key1 },
  //       { bucket, key: key2 }
  //     ]
  //   });
  //   await request(app)
  //     .post(PATH)
  //     .attach(key1, buffer, faker.system.fileName())
  //     .attach(key2, buffer, faker.system.fileName())
  //     .expect(200);
  //   expect(uploadStub).to.have.been.calledTwice;
  // });

  // it('should handle file error after one has already been uploaded', async () => {
  //   uploadStub.onSecondCall().rejects(new Error('Fake error'));
  //   const key1 = faker.lorem.word();
  //   const key2 = faker.lorem.word();
  //   const app = createTestApp({
  //     path: PATH,
  //     files: [
  //       { bucket, key: key1, path: '/test' },
  //       { bucket, key: key2 }
  //     ]
  //   });
  //   await request(app)
  //     .post(PATH)
  //     .attach(key1, buffer, faker.system.fileName())
  //     .attach(key2, buffer, faker.system.fileName())
  //     .expect(500, { errorCode: 'server-error' });
  //   expect(uploadStub).to.have.been.calledTwice;
  //   expect(deleteStub).to.have.been.calledOnce;
  // });

  // it('should throw an error if some files are missing', async () => {
  //   uploadStub.onSecondCall().rejects(new Error('Fake error'));
  //   const key1 = faker.lorem.word();
  //   const key2 = faker.lorem.word();
  //   const app = createTestApp({
  //     path: PATH,
  //     files: [
  //       { bucket, key: key1, path: '/test' },
  //       { bucket, key: key2, required: true }
  //     ]
  //   });
  //   await request(app)
  //     .post(PATH)
  //     .attach(key1, buffer, faker.system.fileName())
  //     .expect(400, { errorCode: 'missing-field' });
  //   expect(uploadStub).to.have.been.calledOnce;
  //   expect(deleteStub).to.have.been.calledOnce;
  // });

  // it('should not throw an error when there is no files and all are optional', async () => {
  //   const key = faker.lorem.word();
  //   const app = createTestApp({ path: PATH, file: { bucket, key } });
  //   await request(app).post(PATH).field('id', randomUUID()).expect(200);
  // });

  // it('should handle additional fields', async () => {
  //   uploadStub.onSecondCall().rejects(new Error('Fake error'));
  //   const key1 = randomUUID();
  //   const key2 = randomUUID();
  //   const value2 = randomUUID();
  //   const key3 = randomUUID();
  //   const value3 = false;
  //   const key4 = randomUUID();
  //   const value4 = [randomUUID(), randomUUID()];
  //   const app = createTestApp({
  //     path: PATH,
  //     files: [{ bucket, key: key1, path: '/test' }],
  //     handler: (req, res) => {
  //       res.json(req.body);
  //     },
  //     validator: {
  //       [key2]: {
  //         in: ['body'],
  //         isArray: { options: { min: 1, max: 1 } },
  //         customSanitizer: { options: (value: Array<unknown>) => value[0] }
  //       },
  //       [`${key2}.*`]: {
  //         isUUID: { options: 4 }
  //       },
  //       [key3]: {
  //         in: ['body'],
  //         isArray: { options: { min: 1, max: 1 } },
  //         customSanitizer: {
  //           options: (value: Array<unknown>) => value[0] === 'true'
  //         }
  //       },
  //       [`${key3}.*`]: {
  //         isBoolean: true
  //       },
  //       [key4]: {
  //         in: ['body'],
  //         isArray: { options: { min: 2, max: 2 } }
  //       },
  //       [`${key4}.*`]: {
  //         isUUID: { options: 4 }
  //       }
  //     }
  //   });
  //   const { body } = <
  //     {
  //       /** */
  //       body: { [name: string]: string };
  //     }
  //   >await request(app).post(PATH).attach(key1, buffer, faker.system.fileName()).field(key2, value2).field(key3, value3).field(key4, value4).expect(200);
  //   expect(uploadStub).to.have.been.calledOnce;
  //   expect(deleteStub).to.not.have.been.calledOnce;
  //   expect(body[key2]).to.equal(value2);
  //   expect(body[key3]).to.equal(value3);
  //   expect(body[key4]).to.deep.equal(value4);
  // });

  // it('should handle field validation error', async () => {
  //   uploadStub.onSecondCall().rejects(new Error('Fake error'));
  //   const key1 = faker.lorem.word();
  //   const key2 = faker.lorem.word();
  //   const value2 = randomUUID();
  //   const key3 = faker.lorem.word();
  //   const value3 = [randomUUID(), randomUUID()];
  //   const app = createTestApp({
  //     path: PATH,
  //     files: [{ bucket, key: key1, path: '/test' }],
  //     handler: (req, res) => {
  //       res.json(req.body);
  //     },
  //     validator: {
  //       [`${key2}.*`]: {
  //         isLength: { options: { max: 1 } }
  //       },
  //       [key2]: {
  //         in: ['body'],
  //         isArray: { options: { min: 1, max: 1 } },
  //         customSanitizer: { options: (value: Array<unknown>) => value[0] }
  //       },
  //       [key3]: {
  //         in: ['body'],
  //         isArray: { options: { min: 1, max: 1 } }
  //       }
  //     }
  //   });
  //   await request(app)
  //     .post(PATH)
  //     .attach(key1, buffer, faker.system.fileName())
  //     .field(key2, value2)
  //     .field(key3, value3)
  //     .expect(400, {
  //       errorCode: 'invalid-request',
  //       hint: { [`${key2}[0]`]: 'Invalid value', [key3]: 'Invalid value' }
  //     });
  // });

  // it('should delete already uploaded files on cancel request', async () => {
  //   const key1 = faker.lorem.word();
  //   const key2 = faker.lorem.word();
  //   const key3 = faker.lorem.word();
  //   process.env.PORT = '3000';
  //   process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  //   const server = new Server({
  //     endpoints: [
  //       new Endpoint({
  //         method: EndpointMethod.POST,
  //         authType: EndpointAuthType.NONE,
  //         handler: (req, res): void => {
  //           res.json({ message: 'success' });
  //         },
  //         files: [
  //           { bucket, key: key1 },
  //           { bucket, key: key2 },
  //           { bucket, key: key3 }
  //         ],
  //         path: PATH,
  //         validator: {}
  //       })
  //     ]
  //   });

  //   await server.init();

  //   const form = new FormData();
  //   form.append(key1, buffer);
  //   form.append(key2, buffer);
  //   form.append(key3, buffer);

  //   const requestConfig = {
  //     headers: {
  //       ...form.getHeaders()
  //     }
  //   };

  //   // eslint-disable-next-line import/no-named-as-default-member
  //   const abort = axios.CancelToken.source();

  //   setTimeout(() => {
  //     abort.cancel(`Request Cancelled`);
  //   }, 50);

  //   uploadStub.callsFake(async (file: Readable, bucket: string) => {
  //     file.resume();
  //     await setTimeoutAsync(1);
  //     return { bucket };
  //   });

  //   await axios
  //     .post(`https://localhost:3000` + PATH, form, {
  //       ...requestConfig,
  //       cancelToken: abort.token
  //     })
  //     .catch((err: Error) => {
  //       expect(err.message).to.equal('Request Cancelled');
  //     });

  //   expect(uploadStub).to.have.been.calledThrice;
  //   await server.shutdown();
  //   process.env.PORT = '8080';
  // });

  // it('should compress avatar before uploading', async () => {
  //   const key = 'avatar';
  //   const app = createTestApp({ path: PATH, file: { bucket, key } });
  //   await request(app)
  //     .post(PATH)
  //     .attach(key, buffer, faker.system.fileName())
  //     .expect(200);
  //   expect(uploadStub).to.have.been.calledOnce;
  // });
});
