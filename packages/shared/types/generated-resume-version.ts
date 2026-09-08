import { VersionSource } from "./resume-version";

export interface GeneratedResumeVersionItem {
  id: string;
  label?: string;
  source: VersionSource;
  createdAt: string;
}

export interface GeneratedResumeVersionDetail extends GeneratedResumeVersionItem {
  name: string;
  content: string;
}

export interface CreateGeneratedResumeVersionRequest {
  label?: string;
}