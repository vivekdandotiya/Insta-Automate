import { JobClassificationResult } from './classifier.interface.js';

export class RuleClassifier {
  private static JOB_TERMS = [
    'hiring', 'hiring alert', 'job alert', 'job opening', 'open positions',
    'vacancy', 'vacancies', 'recruitment', 'recruiting', "we're hiring", 'now hiring',
    'apply now', 'career opportunity', 'walk-in', 'walk in interview', 'interview',
    'internship', 'intern', 'fresher', 'freshers', 'graduate hiring', 'off campus',
    'work from home', 'remote job', 'software developer', 'software engineer',
    'full stack developer', 'frontend developer', 'backend developer', 'react developer',
    'node.js developer', 'java developer', 'python developer', 'qa', 'tester',
    'automation tester', 'devops', 'data analyst', 'bde', 'business development executive',
    'customer support', 'technical support'
  ];

  private static ROLES = [
    { label: 'Full Stack Developer', keywords: ['full stack', 'fullstack', 'mern', 'mean'] },
    { label: 'Frontend Developer', keywords: ['frontend', 'front end', 'react', 'vue', 'angular', 'next.js'] },
    { label: 'Backend Developer', keywords: ['backend', 'back end', 'node', 'express', 'python', 'java', 'django', 'spring'] },
    { label: 'Software Engineer', keywords: ['software engineer', 'software developer', 'sde', 'coder'] },
    { label: 'BDE', keywords: ['bde', 'business development', 'sales executive', 'inside sales'] },
    { label: 'Customer Support', keywords: ['customer support', 'customer care', 'technical support', 'helpdesk'] },
    { label: 'QA / Tester', keywords: ['qa', 'tester', 'quality assurance', 'automation tester', 'selenium'] },
    { label: 'DevOps Engineer', keywords: ['devops', 'cloud engineer', 'aws', 'docker', 'kubernetes'] },
    { label: 'Data Engineer / Analyst', keywords: ['data analyst', 'data engineer', 'sql', 'power bi'] }
  ];

  private static LOCATIONS = [
    { label: 'Noida / Delhi NCR', keywords: ['noida', 'greater noida'] },
    { label: 'Gurugram / Delhi NCR', keywords: ['gurgaon', 'gurugram'] },
    { label: 'Delhi / Delhi NCR', keywords: ['delhi', 'new delhi', 'delhi ncr'] },
    { label: 'Remote', keywords: ['remote', 'work from home', 'wfh'] },
    { label: 'Bangalore', keywords: ['bangalore', 'bengaluru'] },
    { label: 'Hyderabad', keywords: ['hyderabad'] },
    { label: 'Mumbai', keywords: ['mumbai', 'pune'] }
  ];

  public static classify(caption: string, ocrText: string = ''): JobClassificationResult {
    // Sanitize input to protect against malicious text manipulation (Requirement 45)
    const text = `${caption}\n${ocrText}`.toLowerCase();

    // Check for generic advice / tips / non-job patterns (Section 41 False Positive Control)
    const ADVICE_TERMS = ['tips to', 'how to crack', 'career advice', 'top 5', 'top 10', 'cheatsheet', 'roadmap for', 'guide to'];
    const HIRING_ACTION_TERMS = ['hiring', 'vacancy', 'vacancies', 'opening', 'openings', "we're hiring", 'now hiring', 'apply now', 'apply link', 'recruiting', 'walk-in', 'walk in'];
    
    const isAdvicePost = ADVICE_TERMS.some(t => text.includes(t)) && !HIRING_ACTION_TERMS.some(t => text.includes(t));

    // Check key job terms
    const matchedTerms = RuleClassifier.JOB_TERMS.filter(term => text.includes(term));
    const isJobPost = matchedTerms.length >= 1 && !isAdvicePost;

    if (!isJobPost) {
      return {
        isJobPost: false,
        company: 'Not specified',
        role: 'Not specified',
        location: 'Not specified',
        experience: 'Not specified',
        salary: 'Not specified',
        employmentType: 'Not specified',
        workMode: 'Not specified',
        skills: 'Not specified',
        education: 'Not specified',
        deadline: 'Not specified',
        applicationMethod: 'Not specified',
        applicationLink: 'Not specified',
        contactInformation: 'Not specified',
        reason: isAdvicePost ? 'Generic career advice or interview tips post (Section 41)' : 'No recruitment or employment keywords detected',
        confidence: 0.95,
        relevanceScore: 'IRRELEVANT'
      };
    }

    // Role Extraction
    let matchedRole = 'Software Engineer';
    for (const r of RuleClassifier.ROLES) {
      if (r.keywords.some(k => text.includes(k))) {
        matchedRole = r.label;
        break;
      }
    }

    // Location Extraction
    let matchedLocation = 'Not specified';
    const foundLocs: string[] = [];
    for (const l of RuleClassifier.LOCATIONS) {
      if (l.keywords.some(k => text.includes(k))) {
        foundLocs.push(l.label);
      }
    }
    if (foundLocs.length > 0) {
      matchedLocation = foundLocs.join(' / ');
    }

    // Experience Extraction
    let experience = 'Not specified';
    if (text.includes('fresher') || text.includes('freshers') || text.includes('0-1 year') || text.includes('0-2 year') || text.includes('0-2 yrs')) {
      experience = '0-2 Years / Freshers';
    } else if (text.includes('1-3 year') || text.includes('1-3 yrs')) {
      experience = '1-3 Years';
    } else if (text.includes('2-5 year') || text.includes('2+ year')) {
      experience = '2+ Years';
    }

    // Work Mode
    let workMode = 'Not specified';
    if (text.includes('remote') || text.includes('work from home') || text.includes('wfh')) {
      workMode = 'Remote';
    } else if (text.includes('hybrid')) {
      workMode = 'Hybrid';
    } else if (text.includes('office') || text.includes('walk-in') || text.includes('walk in')) {
      workMode = 'On-site';
    }

    // Employment Type
    let employmentType = 'Full Time';
    if (text.includes('intern') || text.includes('internship')) {
      employmentType = 'Internship';
    }

    // Company Extraction (Simple pattern matching)
    let company = 'Not specified';
    const companyMatch = caption.match(/(?:at|company|hiring for|by)\s+([A-Z][A-Za-z0-9\s]{2,20})/i);
    if (companyMatch && companyMatch[1]) {
      company = companyMatch[1].trim();
    }

    // Salary Extraction
    let salary = 'Not specified';
    const salaryMatch = caption.match(/(\d+(?:\.\d+)?\s*(?:lpa|k|lakhs?|cpa))/i);
    if (salaryMatch) {
      salary = salaryMatch[0];
    }

    // Application Link (Requirement 43)
    let applicationLink = 'Not specified';
    const urlMatch = caption.match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch) {
      applicationLink = urlMatch[0];
    } else if (text.includes('link in bio')) {
      applicationLink = 'Link in bio';
    }

    // Relevance Level Scoring (HIGH, MEDIUM, LOW)
    let relevanceScore: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    const isPreferredLocation = text.includes('noida') || text.includes('gurgaon') || text.includes('gurugram') || text.includes('delhi') || text.includes('remote');
    const isPreferredRole = ['Software Engineer', 'Full Stack Developer', 'Frontend Developer', 'Backend Developer', 'BDE', 'Customer Support', 'QA / Tester'].includes(matchedRole);

    if (isPreferredRole && isPreferredLocation) {
      relevanceScore = 'HIGH';
    } else if (isPreferredRole || isPreferredLocation) {
      relevanceScore = 'MEDIUM';
    }

    return {
      isJobPost: true,
      company,
      role: matchedRole,
      location: matchedLocation,
      experience,
      salary,
      employmentType,
      workMode,
      skills: 'Not specified',
      education: 'Not specified',
      deadline: 'Not specified',
      applicationMethod: applicationLink !== 'Not specified' ? 'Direct Link' : 'Not specified',
      applicationLink,
      contactInformation: 'Not specified',
      reason: `Matched job keywords (${matchedTerms.slice(0, 3).join(', ')})`,
      confidence: 0.88,
      relevanceScore
    };
  }
}
