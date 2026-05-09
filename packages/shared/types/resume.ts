export type ParseStatus = "pending" | "parsing" | "parsed" | "failed";

export interface ParseResult {
  name: string;
  contact: { phone?: string; email?: string; location?: string };
  summary?: string;
  workExperience: Array<{
    company: string;
    position: string;
    duration: string;
    description: string;
  }>;
  projectExperience: Array<{
    name: string;
    role: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    school: string;
    major: string;
    degree: string;
    duration: string;
  }>;
  skills: string[];
}

export interface ResumeItem {
  id: string;
  fileNameOriginal: string;
  fileType: "pdf" | "docx";
  parseStatus: ParseStatus;
  fileSize: number;
  freeAnalysisCount: number;
  analysisCount: number;
  createdAt: string;
}

export interface ResumeDetail extends ResumeItem {
  parseResult: ParseResult | null;
  rawText: string | null;
}

export interface UploadResponse {
  resumeId: string;
  fileType: "pdf" | "docx";
  parseStatus: "parsing";
  fileNameOriginal: string;
}