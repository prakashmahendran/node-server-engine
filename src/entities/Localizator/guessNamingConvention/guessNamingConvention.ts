import {
  LocalizatorLocalizationData,
  LocalizatorScripts,
  LocalizatorNamingConventions
} from '../Localizator.types';

export const DEFAULT_NAMING_CONVENTION = {
  regular: '{firstName} {lastName}',
  formal: '{firstName}',
  casual: '{firstName}'
};

/** Guess the naming convention to use for a given name and locale */
export function guessNamingConvention(
  scripts: LocalizatorScripts,
  localeData: LocalizatorLocalizationData,
  name: string,
  locale: string
): LocalizatorNamingConventions {
  // When the locale has a specific script
  // Check if the name matches that script, and use its naming convention
  if (localeData[locale]?.script) {
    const defaultScript = localeData[locale].script as string;
    if (
      testScriptMatch(scripts, defaultScript, name) &&
      scripts[defaultScript].names
    ) {
      return scripts[defaultScript].names;
    }
  }

  // Check if there is a match with any given script and use its naming convention
  for (const script of Object.keys(scripts)) {
    if (testScriptMatch(scripts, script, name) && scripts[script].names) {
      return scripts[script].names;
    }
  }

  // Use the current locale's fallback convention
  if (localeData[locale]?.names?.fallback) {
    return localeData[locale].names.fallback as LocalizatorNamingConventions;
  }

  // If everything fails, use the default convention
  return DEFAULT_NAMING_CONVENTION;
}

/** Test if a given string is in a given script */
function testScriptMatch(
  scripts: LocalizatorScripts,
  script: string,
  string: string
): boolean {
  if (scripts[script]?.rangeRegex) {
    return (scripts[script].rangeRegex as RegExp).test(string);
  }
  return false;
}
