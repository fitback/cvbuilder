export interface JdCoreDecoding {
  core: string;
  hidden: string;
}

export interface OptimizationSuggestion {
  target: string;
  action: "modify" | "add" | "delete";
  detail: string;
  example: string;
}

export interface DetailChecklist {
  type: "delete" | "edit";
  location: string;
  content: string;
}

export interface AnalysisResult {
  matchScore: number;
  matchSummary: string;
  jdCoreDecoding: JdCoreDecoding[];
  optimizationSuggestions: OptimizationSuggestion[];
  detailChecklist: DetailChecklist[];
}

export interface AnalyzeRequest {
  resumeId: string;
  jobDescriptionId: string;
}

export interface AnalyzeResponse {
  analysisRecordId: string;
  matchScore: number;
  jdCoreDecoding: JdCoreDecoding[];
  optimizationSuggestions: OptimizationSuggestion[];
  detailChecklist: DetailChecklist[];
  remainingFreeCount: number;
}

export interface AnalysisHistoryItem {
  id: string;
  matchScore: number;
  jdTitle: string;
  jdCompany: string;
  createdAt: string;
}

export interface AnalysisDetail extends AnalysisResult {
  analysisRecordId: string;
}