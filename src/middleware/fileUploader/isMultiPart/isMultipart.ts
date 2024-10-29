import { Request } from 'express';

const multipartRegex = /^multipart\/form-data.+$/;

/** Determines if the content type of a request is multipart/form-data */
export function isMultipart(request: Request): boolean {
  const type = request.get('Content-Type');
  return !!type && multipartRegex.test(type.toLowerCase());
}
