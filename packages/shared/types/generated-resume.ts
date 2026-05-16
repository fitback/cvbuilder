export interface GeneratedResumeItem {
  id: string;
  name: string;
  snippet: string;
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
  resumeId?: string;
  analysisRecordId?: string;
}

export interface UpdateGeneratedResumeRequest {
  name: string;
  content: string;
}
