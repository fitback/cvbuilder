/**
 * Resume template system — interfaces.
 *
 * A template is a pure function: (TemplateInput) => complete HTML document
 * string. The HTML is fed to Puppeteer to render PDF, and also returned by
 * the preview endpoint so the frontend iframe shows the exact same output.
 *
 * Templates are registered in TemplatesModule and looked up by id via
 * TemplatesService. Adding a new template = implement ResumeTemplate + register
 * it in templates.module.ts.
 */

export interface StructuredExperienceEntry {
  company?: string;
  position?: string;
  duration?: string;
  description?: string;
}

export interface StructuredEducationEntry {
  school?: string;
  major?: string;
  degree?: string;
  duration?: string;
}

export interface StructuredProjectEntry {
  name?: string;
  role?: string;
  duration?: string;
  description?: string;
}

/**
 * Structured resume fields. Mirrors the shape AI extraction produces into
 * Resume.parseResult. All fields optional — templates must gracefully handle
 * missing sections (e.g. a 1-page CV with no work experience).
 */
export interface StructuredResume {
  name?: string;
  phone?: string;
  email?: string;
  summary?: string;
  workExperience?: StructuredExperienceEntry[];
  projectExperience?: StructuredProjectEntry[];
  education?: StructuredEducationEntry[];
  skills?: string[];
}

/**
 * Input to a template's render function.
 *
 * - `markdown`: full resume content as markdown (always present). Templates
 *   may convert to HTML via `marked` for the main body.
 * - `structured`: optional structured fields from parseResult. Templates that
 *   need layout-level access (compact's two-column, creative's banner) use
 *   these to render fields in specific positions.
 */
export interface TemplateInput {
  markdown: string;
  structured?: StructuredResume;
}

/**
 * Metadata exposed by `GET /templates`. Does NOT include the render function
 * (which is a backend-only concern).
 */
export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  /** 16:9 SVG as data URI (base64-encoded). */
  thumbnailDataUri: string;
}

/**
 * A complete template definition. Stored in TemplatesService's registry.
 */
export interface ResumeTemplate extends TemplateMetadata {
  /** Render the resume to a complete HTML document string. */
  render(input: TemplateInput): string;
}
