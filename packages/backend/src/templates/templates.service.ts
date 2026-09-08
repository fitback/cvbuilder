import { Injectable, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { ErrorCode } from "@cvbuilder/shared";
import type { ResumeTemplate, TemplateInput, TemplateMetadata } from "./template.interface";
import { modernTemplate } from "./modern.template";
import { classicTemplate } from "./classic.template";
import { compactTemplate } from "./compact.template";
import { creativeTemplate } from "./creative.template";

/**
 * Registry of available resume templates. Lookups by id are O(1) via Map.
 *
 * Adding a new template = implement ResumeTemplate + add to ALL_TEMPLATES.
 */
const ALL_TEMPLATES: ResumeTemplate[] = [
  modernTemplate,
  classicTemplate,
  compactTemplate,
  creativeTemplate,
];

const TEMPLATE_BY_ID: Map<string, ResumeTemplate> = new Map(
  ALL_TEMPLATES.map((t) => [t.id, t]),
);

const DEFAULT_TEMPLATE_ID = "modern";

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  /** Public list for `GET /templates` (omits render functions). */
  list(): TemplateMetadata[] {
    return ALL_TEMPLATES.map(({ id, name, description, thumbnailDataUri }) => ({
      id,
      name,
      description,
      thumbnailDataUri,
    }));
  }

  /**
   * Render the given template. Falls back to `modern` (with warn log) if the
   * requested template id does not exist — callers get a working PDF rather
   * than a 500.
   */
  render(templateId: string | undefined | null, input: TemplateInput): string {
    const id = (templateId ?? "").trim();
    let template = TEMPLATE_BY_ID.get(id);
    if (!template) {
      if (id) {
        this.logger.warn(
          `Template id "${id}" not found, falling back to "${DEFAULT_TEMPLATE_ID}"`,
        );
      }
      template = TEMPLATE_BY_ID.get(DEFAULT_TEMPLATE_ID)!;
    }
    return template.render(input);
  }

  /** Validate that a template id exists. Throws 400 INVALID_PARAMS if not. */
  assertValid(templateId: string): void {
    if (!TEMPLATE_BY_ID.has(templateId)) {
      throw new HttpException(
        { code: ErrorCode.INVALID_PARAMS, message: `未知模板：${templateId}` },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** True if the id is a registered template. */
  isValid(templateId: string): boolean {
    return TEMPLATE_BY_ID.has(templateId);
  }
}
