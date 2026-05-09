export interface GenerateRequest {
  resumeId: string;
  analysisRecordId: string;
}

export interface GenerateResponse {
  markdown: string;
  resumeId: string;
  analysisRecordId: string;
}
