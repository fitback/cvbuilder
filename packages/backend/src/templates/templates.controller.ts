import { Controller, Get } from "@nestjs/common";
import { ApiResponseInterceptor } from "../common/api-response.interceptor";
import { UseInterceptors } from "@nestjs/common";
import { TemplatesService } from "./templates.service";

/**
 * Public template list endpoint. No auth required — templates are a public
 * design asset, and the list is needed on the login/register pages (preview
 * thumbnails in marketing material could reuse this endpoint later).
 *
 * Returns metadata only; render functions stay backend-only.
 */
@Controller("templates")
@UseInterceptors(ApiResponseInterceptor)
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get()
  list() {
    return this.templates.list();
  }
}
