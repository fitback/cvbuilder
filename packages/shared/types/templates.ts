/**
 * Resume template metadata — shared between backend (TemplatesService) and
 * frontend (TemplateSelector). The render function is backend-only and not
 * exposed here.
 */
export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  /** 16:9 SVG as data URI (base64-encoded). */
  thumbnailDataUri: string;
}
