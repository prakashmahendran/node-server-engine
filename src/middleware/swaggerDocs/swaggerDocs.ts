import path from 'path';
import fs from 'fs';
import { Router } from 'express';
import { glob } from 'glob';
import { globPattern } from 'utils/globPattern';
import YAML from 'yamljs';
import swaggerUi from 'swagger-ui-express';
import {
  EndpointDocumentation,
  IndexDocumentation,
  ResponsesConfig,
  EndpointConfig,
  SchemasConfig,
  SwaggerConfig,
  ComponentDocumentation
} from './swaggerDocs.types';

/** Get the paths of all the endpoint documentation files */
function getEndpointDocPaths(): Array<string> {
  return [
    ...glob.sync(globPattern(process.cwd(), 'src/**/*.docs.yaml')),
    ...glob.sync(globPattern(process.cwd(), 'dist/**/*.docs.yaml'))
  ];
}

/** Get the paths of all the schema files */
function getSchemaPaths(): Array<string> {
  return [
    ...glob.sync(globPattern(process.cwd(), 'src/docs/schemas/*.yaml')),
    ...glob.sync(globPattern(process.cwd(), 'dist/docs/schemas/*.yaml'))
  ];
}

/** Get the paths of all the response files */
function getResponsePaths(): Array<string> {
  return [
    ...glob.sync(globPattern(process.cwd(), 'src/docs/responses/*.yaml')),
    ...glob.sync(globPattern(process.cwd(), 'dist/docs/responses/*.yaml'))
  ];
}

/**
 * Load all data files and merge them in a single object
 * @param files
 * @return {Object}
 */
function loadAndMergeData(files: Array<string>): EndpointDocumentation {
  return files
    .map((file) => YAML.load(file) as EndpointDocumentation)
    .reduce((result, endpoint) => {
      for (const path of Object.keys(endpoint)) {
        if (!(path in result)) result[path] = {};
        result[path] = { ...result[path], ...endpoint[path] };
      }
      return result;
    }, {});
}

/** Load documentation files of all the endpoints */
function loadEndpoints(): EndpointConfig {
  const paths = getEndpointDocPaths();
  const endpoints = loadAndMergeData(paths);
  return {
    paths: endpoints
  };
}

/** Load documentation files of all the schemas */
function loadSchemas(): SchemasConfig {
  const paths = getSchemaPaths();
  const schemas = loadAndMergeData(paths);
  return { schemas };
}

/** Load documentation files of all the responses */
function loadResponses(): ResponsesConfig {
  const paths = getResponsePaths();
  const responses = loadAndMergeData(paths);
  return { responses };
}

/** Load the whole Swagger config */
function loadConfig(): SwaggerConfig {
  // The sources in development, the build output on a server that only has dist/
  const indexPath = ['src', 'dist']
    .map((dir) => path.join(process.cwd(), dir, 'docs', 'index.yaml'))
    .find((file) => fs.existsSync(file));
  const config = (indexPath ? YAML.load(indexPath) : {}) as IndexDocumentation;
  const schemaConfig = loadSchemas();
  const responseConfig = loadResponses();
  const endpointConfig = loadEndpoints();
  return {
    ...config,
    ...endpointConfig,
    // Schemas and responses from index.yaml and from the schemas/ and responses/ folders are merged: a
    // reference to either kind keeps resolving
    components: {
      ...config.components,
      schemas: {
        ...(config.components?.schemas as ComponentDocumentation | undefined),
        ...schemaConfig.schemas
      },
      responses: {
        ...(config.components?.responses as ComponentDocumentation | undefined),
        ...responseConfig.responses
      }
    }
  };
}

/**
 * Get a middleware that serves the documentation
 * @return {Router}
 */
export function swaggerDocs(): Router {
  // Stringify the result and replace any environment variable, then turn it again to an object
  const stringifiedDocumentation = JSON.stringify(loadConfig());
  const placeholderRegex = /##(.+?)##/g;
  const overwrittenDocumentation = stringifiedDocumentation.replace(
    placeholderRegex,
    (match: string, p1: string): string => process.env[p1] ?? ''
  );
  const config = JSON.parse(overwrittenDocumentation) as EndpointDocumentation;

  return Router().use('/docs', swaggerUi.serve, swaggerUi.setup(config));
}
