/** Defines how a name should be displayed for a locale in diferent context */
export interface LocalizatorNamingConventions {
  /** How the name is displayed in a common way */
  regular: string;
  /** How the name is displayed in a formal way */
  formal: string;
  /** How the name is displayed in a casual way */
  casual: string;
}

/** Localization data for each of the locales  */
export interface LocalizatorLocalizationData {
  [locale: string]: LocalizatorLocalizationDataElement;
}

/** Describes localization settings for a locale */
export interface LocalizatorLocalizationDataElement {
  /** Is this locale available to the public */
  enabled: boolean;
  /** How this locale is displayed to the user */
  display: string;
  /** Configuration on how to display names in that locale */
  names: {
    /** Should the first name or the last name be displayed first */
    firstNameFirst: boolean;
    /** Is there a space between the two parts of the name */
    spacing: boolean;
    /** In case the user's name is not displayed in this language's script, how should it be displayed */
    fallback?: LocalizatorNamingConventions;
  };
  /** Script used to identify text written in that language */
  script?: string;
  /** Key in google translation to identify that language */
  cloudTranslationKey: string;
  /** Unicode CLDR key to identify that language if it is different from the locale */
  unicode?: string;
}

/** Script config data indexed by the script id */
export interface LocalizatorScripts {
  [script: string]: LocalizatorScript;
}

/** Localization config for a script */
export interface LocalizatorScript {
  /** Unicode range used to detect the script */
  ranges: Array<string>;
  /** How names are displayed when written in the script */
  names: LocalizatorNamingConventions;
  /** Regex added by the Localizator, used to match with the script unicode ranges */
  rangeRegex?: RegExp;
}
