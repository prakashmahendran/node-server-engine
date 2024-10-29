/** Options to fetch dynamic links */
export interface getDynamicLinksOptions {
  /** Make a shortened link */
  short?: boolean;
}

/** Dynamic link query server response */
export interface DynamicLinkResponseBody {
  /** The generated dynamic link */
  link: string;
}
