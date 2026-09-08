import { IsString, Length, IsOptional, IsIn, IsObject } from "class-validator";

const TEMPLATE_IDS = ["modern", "classic", "compact", "creative"] as const;

export class ExportDto {
  @IsString()
  @Length(1, 50000)
  markdown!: string;

  /** Template id. Defaults to "modern" if absent. */
  @IsOptional()
  @IsIn(TEMPLATE_IDS)
  templateId?: string;

  /** Optional structured resume fields for layout-aware templates (compact/creative). */
  @IsOptional()
  @IsObject()
  structured?: any;
}

export class PreviewDto {
  @IsString()
  @Length(1, 50000)
  markdown!: string;

  @IsOptional()
  @IsIn(TEMPLATE_IDS)
  templateId?: string;

  @IsOptional()
  @IsObject()
  structured?: any;
}
