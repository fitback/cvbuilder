export const TEMPLATE_IDS = ["modern", "classic", "compact", "creative"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export interface GeneratedResumeItem {
  id: string;
  name: string;
  snippet: string;
  templateId: string;
  resumeId?: string;
  analysisRecordId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedResumeDetail extends GeneratedResumeItem {
  content: string;
}

export interface CreateGeneratedResumeRequest {
  name: string;
  content: string;
  templateId?: string;
  resumeId?: string;
  analysisRecordId?: string;
}

export interface UpdateGeneratedResumeRequest {
  name: string;
  content: string;
  templateId?: string;
}
