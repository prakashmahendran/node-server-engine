import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import {
  LocalizatorScript,
  LocalizatorLocalizationDataElement
} from '../Localizator.types';
import {
  guessNamingConvention,
  DEFAULT_NAMING_CONVENTION
} from './guessNamingConvention';

/** Generate fake script config */
function generateScriptData(
  overrides: Partial<LocalizatorScript> = {}
): LocalizatorScript {
  return {
    rangeRegex: new RegExp(`^\b$`, 'u'),
    ranges: ['a'],
    names: {
      casual: faker.lorem.slug(),
      regular: faker.lorem.slug(),
      formal: faker.lorem.slug()
    },
    ...overrides
  };
}

/** Generate locales file random data */
function generateLocalizationData(
  overrides: Partial<LocalizatorLocalizationDataElement> = {}
): LocalizatorLocalizationDataElement {
  return {
    script: faker.lorem.word(),
    enabled: true,
    display: faker.lorem.word(),
    names: {
      firstNameFirst: true,
      spacing: true
    },
    cloudTranslationKey: faker.location.countryCode(),
    ...overrides
  };
}

describe('Service - Localizator - Guess naming convention', function () {
  it('should return the convention for the locale specifc script', function () {
    const locale = faker.location.country();
    const userScript = faker.lorem.word();
    const name = faker.lorem.word();
    const scriptData = generateScriptData({
      rangeRegex: new RegExp(name, 'u')
    });

    const Localizator = {
      localeData: {
        [faker.location.countryCode()]: generateLocalizationData(),
        [locale]: generateLocalizationData({ script: userScript })
      },
      scripts: {
        [faker.lorem.word()]: generateScriptData(),
        [userScript]: scriptData
      }
    };
    const result = guessNamingConvention(
      Localizator.scripts,
      Localizator.localeData,
      name,
      locale
    );

    expect(result).to.equal(scriptData.names);
  });

  it('should return the convention for the the script detected in the name if no match wirth the default script', function () {
    const locale = faker.location.country();
    const expectedResult = {
      casual: faker.lorem.word(),
      regular: faker.lorem.word(),
      formal: faker.lorem.word()
    };
    const userScript = faker.lorem.word();
    const name = faker.lorem.word();
    const Localizator = {
      localeData: {
        [faker.location.countryCode()]: generateLocalizationData(),
        [locale]: generateLocalizationData({ script: userScript })
      },
      scripts: {
        [faker.lorem.word()]: generateScriptData(),
        [userScript]: generateScriptData(),
        [faker.lorem.word()]: generateScriptData({
          rangeRegex: new RegExp(name, 'u'),
          names: expectedResult
        })
      }
    };
    const result = guessNamingConvention(
      Localizator.scripts,
      Localizator.localeData,
      name,
      locale
    );
    expect(result).to.equal(expectedResult);
  });

  it('should return the convention for the locale if no script match', function () {
    const locale = faker.location.country();
    const expectedResult = {
      casual: faker.lorem.word(),
      regular: faker.lorem.word(),
      formal: faker.lorem.word()
    };
    const userScript = faker.lorem.word();
    const name = faker.lorem.word();
    const Localizator = {
      localeData: {
        [faker.location.countryCode()]: generateLocalizationData({
          script: faker.lorem.word()
        }),
        [locale]: generateLocalizationData({
          script: userScript,
          names: {
            firstNameFirst: true,
            spacing: true,
            fallback: expectedResult
          }
        })
      },
      scripts: {
        [faker.lorem.word()]: generateScriptData(),
        [userScript]: generateScriptData()
      }
    };
    const result = guessNamingConvention(
      Localizator.scripts,
      Localizator.localeData,
      name,
      locale
    );
    expect(result).to.equal(expectedResult);
  });

  it('should use the default if no fallback exist', function () {
    const locale = faker.location.country();
    const userScript = faker.lorem.word();
    const name = faker.lorem.word();
    const Localizator = {
      localeData: {
        [faker.location.countryCode()]: generateLocalizationData(),
        [locale]: generateLocalizationData({ script: userScript })
      },
      scripts: {
        [faker.lorem.word()]: generateScriptData(),
        [userScript]: generateScriptData()
      }
    };
    const result = guessNamingConvention(
      Localizator.scripts,
      Localizator.localeData,
      name,
      locale
    );
    expect(result).to.equal(DEFAULT_NAMING_CONVENTION);
  });
});
