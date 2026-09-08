export interface JobDescriptionItem {
  id: string;
  title: string;
  company?: string;
  createdAt: string;
}

/** Full JD including content — returned by `GET /jobs/:id`. */
export interface JobDescriptionDetail extends JobDescriptionItem {
  content: string;
}

export interface CreateJobRequest {
  title: string;
  company?: string;
  content: string;
}

export interface CreateJobResponse {
  jobDescriptionId: string;
}

/** Partial update — all fields optional. Used by `PUT /jobs/:id`. */
export interface UpdateJobRequest {
  title?: string;
  company?: string;
  content?: string;
}