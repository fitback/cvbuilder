import { ParseResult } from "./resume";

export type VersionSource = "auto" | "manual" | "before_restore";

export interface ResumeVersionItem {
  id: string;
  label?: string;
  source: VersionSource;
  createdAt: string;
}

export interface ResumeVersionDetail extends ResumeVersionItem {
  parseResult: ParseResult | null;
  rawText: string | null;
}

export interface CreateResumeVersionRequest {
  label?: string;
}