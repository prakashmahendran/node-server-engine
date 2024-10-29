/** Documentation content */
export interface EndpointDocumentation {
  [path: string]: { [key: string]: unknown };
}

/** Documentation content  */
interface ComponentDocumentation {
  [name: string]: { [key: string]: unknown };
}

/** root documentation config */
export interface IndexDocumentation extends EndpointDocumentation {
  /** Global components to be documented */
  components: ComponentDocumentation;
}

/** Documentation config for endpoints */
export interface EndpointConfig {
  /** Documentation content */
  paths: EndpointDocumentation;
}

/** Documentation config for responses */
export interface ResponsesConfig {
  /** Documentation content */
  responses: ComponentDocumentation;
}

/** Documentation config for schemas */
export interface SchemasConfig {
  /** Documentation content */
  schemas: ComponentDocumentation;
}

export type SwaggerConfig = IndexDocumentation &
  EndpointConfig & {
    /** Shared components documentation */
    components: IndexDocumentation['components'] &
      ResponsesConfig &
      SchemasConfig;
  };
