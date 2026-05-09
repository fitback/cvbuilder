export interface JobDescriptionItem {
  id: string;
  title: string;
  company?: string;
  createdAt: string;
}

export interface CreateJobRequest {
  title: string;
  company?: string;
  content: string;
}

export interface CreateJobResponse {
  jobDescriptionId: string;
}