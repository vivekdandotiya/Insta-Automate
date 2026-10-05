import { JobClassificationResult } from './classifier.interface.js';

export class RuleClassifier {
  private static JOB_TERMS = [
    // Job Related
    'job', 'jobs', 'job alert', 'job alerts', 'vacancy', 'vacancies', 'opening', 'openings',
    'job opening', 'hiring', 'actively hiring', 'recruitment', 'recruiting', 'career', 'careers',
    'employment', 'opportunity', 'opportunities', 'work opportunity', 'career opportunity',
    'job opportunity', "we're hiring", 'now hiring', 'apply now', 'apply link',
    // Internship
    'internship', 'internships', 'intern', 'hiring interns', 'internship opening',
    'internship opportunity', 'paid internship', 'unpaid internship', 'summer internship',
    'software internship', 'tech internship',
    // Fresher / Entry Level
    'fresher', 'freshers', 'freshers hiring', 'entry level', 'entry-level', 'graduate hiring',
    'graduate jobs', 'campus hiring', 'campus placement', '0 years experience', 'no experience',
    'fresh graduates', 'off campus',
    // Recruitment Drives
    'recruitment drive', 'hiring drive', 'walk-in', 'walk in interview', 'interview drive',
    'mega hiring', 'mass hiring', 'immediate joining', 'urgent hiring',
    // Tech / IT
    'it jobs', 'it vacancy', 'software jobs', 'software engineer', 'software developer',
    'developer hiring', 'web developer', 'frontend developer', 'backend developer',
    'full stack developer', 'fullstack developer', 'react developer', 'node.js developer',
    'java developer', 'python developer', 'javascript developer', 'typescript developer',
    'php developer', 'laravel developer', 'mobile app developer', 'android developer',
    'sde', 'sde intern', 'mern developer', 'mean developer',
    'qa', 'tester', 'software tester', 'automation tester', 'test engineer',
    'devops', 'cloud engineer', 'site reliability engineer', 'sre',
    'data analyst', 'data engineer', 'machine learning', 'ai', 'ui/ux',
    'technical support', 'software support', 'it support', 'application support', 'system administrator', 'network engineer',
    // Business / Sales / Support
    'bde', 'business development executive', 'business development associate', 'bda',
    'inside sales', 'sales executive', 'customer support', 'customer care', 'customer service',
    'support executive',
    // Government & Public Recruitment
    'dsssb', 'ssc', 'railway', 'rrb', 'banking', 'ibps', 'sbi', 'government recruitment',
    'government jobs', 'sarkari', 'court recruitment', 'district court', 'high court'
  ];

  private static ROLES = [
    { label: 'Full Stack Developer', keywords: ['full stack', 'fullstack', 'mern', 'mean'] },
    { label: 'Frontend Developer', keywords: ['frontend', 'front end', 'react', 'vue', 'angular', 'next.js', 'javascript developer', 'typescript developer'] },
    { label: 'Backend Developer', keywords: ['backend', 'back end', 'node', 'express', 'python developer', 'java developer', 'django', 'spring', 'php developer', 'laravel'] },
    { label: 'Mobile App Developer', keywords: ['mobile app', 'android developer', 'ios developer', 'flutter', 'react native'] },
    { label: 'Software Engineer / SDE', keywords: ['software engineer', 'software developer', 'sde', 'coder', 'developer hiring', 'web developer', 'it jobs', 'software jobs'] },
    { label: 'QA / Automation Tester', keywords: ['qa', 'tester', 'software tester', 'quality assurance', 'automation tester', 'test engineer', 'selenium'] },
    { label: 'DevOps / Cloud Engineer', keywords: ['devops', 'cloud engineer', 'site reliability engineer', 'sre', 'aws', 'docker', 'kubernetes'] },
    { label: 'Technical Support / IT', keywords: ['technical support', 'software support', 'it support', 'application support', 'system administrator', 'network engineer', 'helpdesk'] },
    { label: 'Business Development / Sales', keywords: ['bde', 'bda', 'business development', 'inside sales', 'sales executive'] },
    { label: 'Customer Support Executive', keywords: ['customer support', 'customer care', 'customer service', 'support executive'] },
    { label: 'Government Recruitment', keywords: ['dsssb', 'ssc', 'railway', 'rrb', 'banking', 'ibps', 'sbi', 'government recruitment', 'government jobs', 'sarkari', 'court recruitment', 'district court'] },
    { label: 'Internship / Trainee', keywords: ['internship', 'intern', 'hiring interns', 'paid internship', 'unpaid internship', 'summer internship', 'sde intern'] }
  ];

  private static LOCATIONS = [
    { label: 'Delhi NCR', keywords: ['noida', 'greater noida', 'gurgaon', 'gurugram', 'delhi', 'new delhi', 'delhi ncr', 'ncr', 'ghaziabad', 'faridabad'] },
    { label: 'Remote / WFH', keywords: ['remote', 'work from home', 'wfh'] },
    { label: 'India', keywords: ['pan india', 'across india', 'india', 'multiple locations'] },
    { label: 'Bangalore', keywords: ['bangalore', 'bengaluru'] },
    { label: 'Hyderabad', keywords: ['hyderabad'] },
    { label: 'Mumbai / Pune', keywords: ['mumbai', 'pune'] }
  ];

  public static classify(caption: string, ocrText: string = ''): JobClassificationResult {
    const text = `${caption}\n${ocrText}`.toLowerCase();

    // False positive control: Reject generic career tips/blogs unless active hiring call exists
    const ADVICE_TERMS = [
      'tips for', 'tips to', 'how to crack', 'career advice', 'top 5', 'top 10',
      'cheatsheet', 'roadmap for', 'guide to', 'morning routine', 'my journey', 'how i got'
    ];
    const HIRING_ACTION_TERMS = [
      'hiring', 'vacancy', 'vacancies', 'opening', 'openings', "we're hiring", 'now hiring',
      'apply now', 'apply link', 'recruiting', 'walk-in', 'walk in', 'hiring drive', 'hiring interns',
      'link in bio', 'urgent hiring', 'immediate joining', 'internship opportunity', 'job opening',
      'recruitment'
    ];
    
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
        reason: isAdvicePost ? 'Generic career advice or interview tips post without active hiring call' : 'No recruitment or employment keywords detected',
        relevanceReason: 'No recruitment keywords detected',
        confidence: 0.95,
        relevanceScore: 'IRRELEVANT'
      };
    }

    // Role Extraction
    let matchedRole = 'Software Engineer / SDE';
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
      matchedLocation = Array.from(new Set(foundLocs)).join(' / ');
    }

    // Experience Extraction
    let experience = 'Not specified';
    if (text.includes('fresher') || text.includes('freshers') || text.includes('0-1 year') || text.includes('0-2 year') || text.includes('0-2 yrs') || text.includes('0 years') || text.includes('no experience') || text.includes('entry level')) {
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

    // Company Extraction
    let company = 'Not specified';
    const companyMatch = caption.match(/(?:at|company|hiring for|by|org)\s+([A-Z][A-Za-z0-9\s]{2,20})/i);
    if (companyMatch && companyMatch[1]) {
      company = companyMatch[1].trim();
    }

    // Salary Extraction
    let salary = 'Not specified';
    const salaryMatch = caption.match(/(\d+(?:\.\d+)?\s*(?:k|lpa|lakhs?|cpa|rs|inr))/i);
    if (salaryMatch) {
      salary = salaryMatch[0];
    }

    // URL Extraction (Part 7 & Part 8)
    const urlMatches = (caption.match(/(https?:\/\/[^\s\)\>\]"']+)/g) || []);
    let applicationUrl: string | undefined = undefined;
    let interviewUrl: string | undefined = undefined;
    let testUrl: string | undefined = undefined;
    let externalUrl: string | undefined = undefined;

    for (const rawUrl of urlMatches) {
      const cleanUrl = rawUrl.replace(/[.,;:]$/, '');
      const lowerUrl = cleanUrl.toLowerCase();
      if (lowerUrl.includes('test') || lowerUrl.includes('assessment') || lowerUrl.includes('hackerrank') || lowerUrl.includes('hackerearth') || lowerUrl.includes('testgorilla') || lowerUrl.includes('codility')) {
        testUrl = cleanUrl;
      } else if (lowerUrl.includes('interview') || lowerUrl.includes('walkin')) {
        interviewUrl = cleanUrl;
      } else if (lowerUrl.includes('apply') || lowerUrl.includes('forms.gle') || lowerUrl.includes('unstop') || lowerUrl.includes('linkedin.com/jobs') || lowerUrl.includes('careers')) {
        applicationUrl = cleanUrl;
      } else if (!externalUrl) {
        externalUrl = cleanUrl;
      }
    }

    if (!applicationUrl && externalUrl) {
      applicationUrl = externalUrl;
    }

    const applicationLink = applicationUrl || (text.includes('link in bio') ? 'Link in bio' : 'Not specified');

    // Relevance Level Scoring & Explanation (Part 6)
    let relevanceScore: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    const isPreferredLocation = text.includes('noida') || text.includes('gurgaon') || text.includes('gurugram') || text.includes('delhi') || text.includes('ghaziabad') || text.includes('faridabad') || text.includes('remote') || text.includes('wfh') || text.includes('india');
    const isPreferredRole = matchedRole !== 'Not specified';
    const hasApplyLink = applicationUrl !== undefined || text.includes('link in bio');

    let relevanceReason = '';
    if (isPreferredRole && isPreferredLocation && hasApplyLink) {
      relevanceScore = 'HIGH';
      relevanceReason = `${matchedRole} + ${matchedLocation} + Apply Link`;
    } else if (isPreferredRole && isPreferredLocation) {
      relevanceScore = 'HIGH';
      relevanceReason = `${matchedRole} + ${matchedLocation}`;
    } else if (isPreferredRole || isPreferredLocation) {
      relevanceScore = 'MEDIUM';
      relevanceReason = isPreferredRole ? `${matchedRole} (Location Unclear)` : `${matchedLocation} (Role Generic)`;
    } else {
      relevanceScore = 'LOW';
      relevanceReason = 'Generic career opening';
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
      applicationUrl,
      interviewUrl,
      testUrl,
      externalUrl,
      relevanceReason,
      contactInformation: 'Not specified',
      reason: `Matched job keywords (${matchedTerms.slice(0, 3).join(', ')})`,
      confidence: 0.88,
      relevanceScore
    };
  }
}
