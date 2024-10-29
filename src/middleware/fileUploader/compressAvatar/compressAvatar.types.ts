/** Options to compress image */
export interface CompressionOptions {
  /** Set dimensions in which the image will be resized */
  resize: {
    /** Height of the resized image */
    height: number;
    /** Width of the resized image */
    width: number;
  };
  /** JPG quality factor to apply when compressing */
  quality: number;
}
