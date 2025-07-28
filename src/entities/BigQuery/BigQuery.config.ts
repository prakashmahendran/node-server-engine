import path from "path";
import { BigQuery } from "@google-cloud/bigquery";
import { Storage } from "@google-cloud/storage";
import dotenv from "dotenv";
import { validateBigQueryEnvironment } from "./BigQuery.validate";

// Load environment variables from .env
dotenv.config();

// Validate required environment variables for BigQuery
validateBigQueryEnvironment();

// Resolve key file path securely
const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.resolve(process.cwd(), "config", "key.json");

// Initialize BigQuery
export const bigquery = new BigQuery({
  projectId: process.env.PROJECT_ID,
  keyFilename: keyFilePath,
});

// Optional: Initialize GCS if BUCKET_NAME is set
export const bucketName = process.env.BUCKET_NAME || null;

export const storage = bucketName
  ? new Storage({
      projectId: process.env.PROJECT_ID,
      keyFilename: keyFilePath,
    })
  : null;

// Exported for environments (similar to Sequelize style)
export const development = bigquery;
export const staging = bigquery;
export const production = bigquery;
export const test = bigquery;

export default bigquery;
