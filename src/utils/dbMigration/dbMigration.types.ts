/** Options to recreate the database */
export interface RecreateDbOptions {
  /** Do not run the migrations, leave the DB empty */
  clean?: boolean;
}

/** Options to clear the database */
export interface ClearDbOptions {
  /** Also truncate the migration metadata table. This should only be used when testing on the metadata table itself */
  includeMetadata?: boolean;
}
