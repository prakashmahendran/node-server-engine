import { randomBytes } from 'crypto';
import { faker } from '@faker-js/faker';
import sinon, { SinonStub } from 'sinon';
import { Storage } from 'entities/Storage/Storage';
import { StorageUploadedFile } from 'entities/Storage/Storage.types';

/**
 * Locales server stubbing
 * Will return fake content based on paths
 */
export function stubLocales(): SinonStub {
  return sinon
    .stub(Storage, 'get')
    .callsFake(async (bucket: string, path: string) => {
      let content;

      switch (path) {
        case 'locales.json':
          content = { 'en-US': 'English' };
          break;
        case 'index.json':
          content = ['emails.json'];
          break;
        case 'localeData.json':
          content = {
            'en-US': {
              enabled: true,
              display: 'English',
              names: {
                firstNameFirst: true,
                spacing: true
              }
            }
          };
          break;
        case 'scripts.json':
          content = {};
          break;
        case 'en-US/emails.json':
          content = {
            welcome: {
              subject: '🎊 {USER_FIRST_NAME} your account is ready!',
              header: '{USER_FIRST_NAME}, your account is ready!',
              body: 'Congratulations {USER_FIRST_NAME}!\n\nYou have successfully created an account with {USER_EMAIL}\n\nPlease return to the screen where you signed up, and you will be signed in.',
              footer:
                'This email was sent to {USER_EMAIL}.\nYou received this email because you successfully signed up.'
            }
          };
          break;
        default:
          throw new Error(`No match for path '${path}' on locales server`);
      }

      const metadata: StorageUploadedFile = {
        bucket,
        name: path,
        contentType: faker.system.mimeType(),
        size: `${faker.number.int()}`,
        timeCreated: new Date().toISOString(),
        updated: new Date().toISOString(),
        md5Hash: randomBytes(32).toString('base64'),
        crc32c: randomBytes(32).toString('base64'),
        storageClass: 'normal'
      };

      return { data: Buffer.from(JSON.stringify(content), 'utf-8'), metadata };
    });
}
