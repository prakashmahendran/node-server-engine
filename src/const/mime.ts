export const IMAGE_BASIC_MIME = ['image/jpeg', 'image/png'];

export const IMAGE_MIME = [...IMAGE_BASIC_MIME, 'image/gif', 'image/bmp'];

export const AUDIO_MIME = [
  'audio/aac',
  'audio/mpeg',
  'audio/wave',
  'audio/wav'
];

export const VIDEO_MIME = [
  'video/mpeg',
  'video/mp4',
  'video/3gpp',
  'video/3gp2'
];

export const PDF_MIME = ['application/pdf'];

export const WORD_MIME = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

export const EXCEL_MIME = [
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

export const POWERPOINT_MIME = [
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.presentationml.slideshow'
];

export const OFFICE_MIME = [...WORD_MIME, ...EXCEL_MIME, ...POWERPOINT_MIME];
