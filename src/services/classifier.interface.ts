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
  applicationUrl?: string;
  interviewUrl?: string;
  testUrl?: string;
  externalUrl?: string;
  relevanceReason?: string;
  contactInformation: string;
  reason: string;
  confidence: number;
  relevanceScore: 'HIGH' | 'MEDIUM' | 'LOW' | 'IRRELEVANT';
}
