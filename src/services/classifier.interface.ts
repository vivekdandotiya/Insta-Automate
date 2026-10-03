export interface JobClassificationResult {
  isJobPost: boolean;
  company: string;
  role: string;
  location: string;
  experience: string;
  salary: string;
  employmentType: string;
  workMode: string;
  skills: string;
  education: string;
  deadline: string;
  applicationMethod: string;
  applicationLink: string;
  contactInformation: string;
  reason: string;
  confidence: number;
  relevanceScore: 'HIGH' | 'MEDIUM' | 'LOW' | 'IRRELEVANT';
}
