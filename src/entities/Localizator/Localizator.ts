import { guessNamingConvention } from './guessNamingConvention';
import {
  LocalizatorLocalizationData,
  LocalizatorLocalizationDataElement,
  LocalizatorScripts,
  LocalizatorNamingConventions
} from './Localizator.types';
import { EngineError } from 'entities/EngineError';
import { LifecycleController } from 'entities/LifecycleController';
import { GoogleCloudStorage } from 'entities/GoogleCloudStorage';
import { assertEnvironment } from 'utils/checkEnvironment';
import { envAssert } from 'utils/envAssert';
import { reportError, reportDebug } from 'utils/report';

const namespace = 'engine:localizator';

const REFRESH_FREQUENCY = 10 * 60 * 1000;

let localeData: undefined | LocalizatorLocalizationData;
let scripts: undefined | LocalizatorScripts;
let interval: NodeJS.Timeout | string | number | undefined;

/** Service handling contextual localization */
export const Localizator = {
  async init(): Promise<void> {
    assertEnvironment({ LOCALES_BUCKET: envAssert.isString() });
    await Localizator.synchronize();
    // Keep synchronizing
    interval = setInterval(() => {
      Localizator.synchronize().catch((error) => {
        reportError(error);
      });
    }, REFRESH_FREQUENCY);
    LifecycleController.register(Localizator);
  },

  /**
   * Fetch a JSON file from the locales bucket
   */
  async getLocaleFile<T>(file: string): Promise<T> {
    reportDebug({
      namespace,
      message: `Starting download of localization file [${file}]`,
      data: { bucket: process.env.LOCALES_BUCKET, file }
    });
    const { data } = await GoogleCloudStorage.get(
      process.env.LOCALES_BUCKET as string,
      file
    );
    const stringified = data.toString('utf-8');
    const result = JSON.parse(stringified) as T;
    reportDebug({
      namespace,
      message: `Fetched localization file [${file}]`,
      data: { bucket: process.env.LOCALES_BUCKET, file, result }
    });
    return result;
  },

  /**
   * Synchronizes the localeData and scripts files
   * Should be called only once on startup
   */
  async synchronize(): Promise<void> {
    reportDebug({ namespace, message: `Starting synchronizing` });
    const [fetchedLocaleData, fetchedScripts] = await Promise.all([
      Localizator.getLocaleFile<LocalizatorLocalizationData>('localeData.json'),
      Localizator.getLocaleFile<LocalizatorScripts>('scripts.json')
    ]);
    localeData = fetchedLocaleData;
    scripts = Localizator.buildRangeRegex(fetchedScripts);
    reportDebug({ namespace, message: `Finished synchronizing` });
  },

  /** Transform unicode ranges in scripts data to regex */
  buildRangeRegex(script: LocalizatorScripts): LocalizatorScripts {
    for (const i of Object.keys(script)) {
      const ranges = script[i].ranges;
      if (ranges) {
        script[i].rangeRegex = new RegExp(`[${ranges.join('')}]`, 'u');
      }
    }
    return script;
  },

  /** Guess the naming convention to use for a given name and locale */
  guessNamingConvention(
    firstName: string,
    lastName: string,
    locale: string
  ): LocalizatorNamingConventions {
    if (!scripts || !localeData)
      throw new EngineError({ message: 'Localizator is not initialized' });
    const name = firstName + lastName; // merge two names if possible
    return guessNamingConvention(scripts, localeData, name, locale);
  },

  /**
   * Calculate the different display names for a user
   */
  getDisplayNames(
    firstName: string,
    lastName: string,
    locale: string
  ): LocalizatorNamingConventions {
    const convention = Localizator.guessNamingConvention(
      firstName,
      lastName,
      locale
    );
    return Object.keys(convention).reduce((convention, type) => {
      const safeType = type as keyof LocalizatorNamingConventions;
      convention[safeType] = convention[safeType]
        .replace('{firstName}', firstName)
        .replace('{lastName}', lastName ?? '')
        .trim();
      return convention;
    }, convention);
  },

  /** Get the localization data for a locale */
  getLocaleData(locale: string): LocalizatorLocalizationDataElement {
    if (!localeData)
      throw new EngineError({ message: 'Localizator is not initialized' });
    return localeData[locale];
  },

  /** Check if a locale exists */
  isValidLocale(locale: string): boolean {
    if (!localeData)
      throw new EngineError({ message: 'Localizator is not initialized' });
    return localeData[locale] !== undefined;
  },

  /** Cleanup the instance */
  shutdown(): void {
    if (interval) clearInterval(interval);
  }
};
