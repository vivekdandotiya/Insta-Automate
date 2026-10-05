import { JobClassificationResult } from './classifier.interface.js';

export class RuleClassifier {
  // EXPLICIT KEYWORD AUDIT: PRESERVED 100% EXISTING + EXPANDED NEW KEYWORDS
  public static JOB_TERMS = [
    // --- PRESERVED EXISTING KEYWORDS ---
    'job', 'jobs', 'job alert', 'job alerts', 'vacancy', 'vacancies', 'opening', 'openings',
    'job opening', 'hiring', 'actively hiring', 'recruitment', 'recruiting', 'career', 'careers',
    'employment', 'opportunity', 'opportunities', 'work opportunity', 'career opportunity',
    'job opportunity', "we're hiring", 'now hiring', 'apply now', 'apply link',
    'internship', 'internships', 'intern', 'hiring interns', 'internship opening',
    'internship opportunity', 'paid internship', 'unpaid internship', 'summer internship',
    'software internship', 'tech internship',
    'fresher', 'freshers', 'freshers hiring', 'entry level', 'entry-level', 'graduate hiring',
    'graduate jobs', 'campus hiring', 'campus placement', '0 years experience', 'no experience',
    'fresh graduates', 'off campus',
    'recruitment drive', 'hiring drive', 'walk-in', 'walk in interview', 'interview drive',
    'mega hiring', 'mass hiring', 'immediate joining', 'urgent hiring',
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
    'bde', 'business development executive', 'business development associate', 'bda',
    'inside sales', 'sales executive', 'customer support', 'customer care', 'customer service',
    'support executive',
    'dsssb', 'ssc', 'railway', 'rrb', 'banking', 'ibps', 'sbi', 'government recruitment',
    'government jobs', 'sarkari', 'court recruitment', 'district court', 'high court',

    // --- NEW ADDITIONS (PROMPT 6) ---
    'we are hiring', 'urgent hiring', 'bulk hiring', 'mass hiring', 'mega hiring',
    'walk-in hiring', 'walk-in', 'walk in', 'immediate hiring', 'immediate joining', 'immediate joiner',
    'job openings', 'job opportunities', 'open positions', 'positions available',
    'apply here', 'applications open', 'registration open', 'shortlisting', 'shortlisted',
    'interview', 'interviews', 'assessment', 'assessments', 'test', 'tests', 'online test',
    'coding test', 'aptitude test', 'selection process', 'selection', 'hiring process',
    'job fair', 'career fair', 'walk-in interview', 'walk in interview',
    'fresh graduate', 'recent graduate', 'recent graduates', 'graduate', 'graduates',
    'graduate trainee', 'graduate trainees', 'trainee', 'trainees', 'management trainee',
    'management trainees', 'apprentice', 'apprenticeship', 'graduate apprentice', 'graduate apprenticeship',
    'without experience', '0 years', '0 year', '0-1 years', '0 to 1 years', '0–1 years',
    'experienced/freshers', 'experienced or freshers', 'freshers eligible', 'fresher eligible',
    'freshers can apply', 'freshers welcome', 'open for freshers', 'no resume shortlisting', 'no assessment',
    'talent acquisition', 'talent acquisition coordinator', 'talent acquisition trainee',
    'talent acquisition associate', 'hr recruiter', 'recruitment coordinator', 'recruitment intern',
    'cisco is hiring', 'hiring for'
  ];

  public static ROLES = [
    // --- PRESERVED EXISTING + NEW ROLE COMBINATIONS ---
    { label: 'Full Stack Developer', keywords: ['full stack', 'fullstack', 'mern', 'mean', 'full stack engineer', 'full stack developer'] },
    { label: 'Frontend Developer', keywords: ['frontend', 'front end', 'react', 'vue', 'angular', 'next.js', 'javascript developer', 'typescript developer', 'frontend engineer', 'web designer'] },
    { label: 'Backend Developer', keywords: ['backend', 'back end', 'node', 'express', 'python developer', 'java developer', 'django', 'spring', 'php developer', 'laravel', 'backend engineer'] },
    { label: 'Mobile App Developer', keywords: ['mobile app', 'android developer', 'ios developer', 'flutter', 'react native', 'mobile developer', 'app developer'] },
    { label: 'Software Engineer / SDE', keywords: ['software engineer', 'software developer', 'sde', 'coder', 'developer hiring', 'web developer', 'it jobs', 'software jobs', 'sde intern', 'software development intern'] },
    { label: 'QA / Automation Tester', keywords: ['qa', 'tester', 'software tester', 'quality assurance', 'automation tester', 'test engineer', 'selenium', 'manual tester', 'manual testing', 'automation qa'] },
    { label: 'DevOps / Cloud Engineer', keywords: ['devops', 'cloud engineer', 'site reliability engineer', 'sre', 'aws', 'docker', 'kubernetes', 'cloud support', 'devops engineer'] },
    { label: 'Technical Support / IT', keywords: ['technical support', 'software support', 'it support', 'application support', 'system administrator', 'network engineer', 'helpdesk', 'it helpdesk', 'system admin'] },
    { label: 'Talent Acquisition / HR', keywords: ['talent acquisition', 'talent acquisition coordinator', 'talent acquisition trainee', 'talent acquisition associate', 'hr recruiter', 'recruitment coordinator', 'recruitment intern', 'hr executive', 'hr intern', 'hr associate', 'recruiter', 'hr'] },
    { label: 'Business Development / Sales', keywords: ['bde', 'bda', 'business development', 'inside sales', 'sales executive', 'sales associate', 'sales representative', 'sales intern', 'relationship executive', 'relationship manager', 'academic counselor', 'academic consultant', 'admission counselor', 'customer success'] },
    { label: 'Customer Support Executive', keywords: ['customer support', 'customer care', 'customer service', 'support executive', 'customer experience', 'chat support', 'chat process', 'voice support', 'voice process', 'non voice', 'non-voice', 'support associate'] },
    { label: 'Government Recruitment', keywords: ['dsssb', 'ssc', 'railway', 'rrb', 'banking', 'ibps', 'sbi', 'government recruitment', 'government jobs', 'sarkari', 'court recruitment', 'district court', 'delhi district courts', 'upsc', 'state government', 'government exam'] },
    { label: 'Internship / Graduate Trainee / Apprentice', keywords: ['internship', 'intern', 'hiring interns', 'paid internship', 'unpaid internship', 'summer internship', 'graduate trainee', 'graduate apprentice', 'management trainee', 'apprentice', 'apprenticeship', 'trainee'] }
  ];

  public static LOCATIONS = [
    // --- PRESERVED EXISTING + NEW LOCATION KEYWORDS ---
    { label: 'Delhi NCR', keywords: ['noida', 'greater noida', 'gurgaon', 'gurugram', 'delhi', 'new delhi', 'delhi ncr', 'ncr', 'ghaziabad', 'faridabad'] },
    { label: 'Remote / WFH', keywords: ['remote', 'work from home', 'wfh', 'work-from-home', 'remote work', 'hybrid'] },
    { label: 'India', keywords: ['pan india', 'across india', 'india', 'multiple locations', 'all india', 'nationwide'] },
    { label: 'Bangalore', keywords: ['bangalore', 'bengaluru'] },
    { label: 'Hyderabad', keywords: ['hyderabad'] },
    { label: 'Mumbai / Pune', keywords: ['mumbai', 'pune'] }
  ];

  public static classify(caption: string, ocrText: string = ''): JobClassificationResult {
    const rawText = `${caption}\n${ocrText}`;
    const text = rawText.toLowerCase();

    // False positive control: Reject generic career tips/blogs unless active hiring call exists
    const ADVICE_TERMS = [
      'tips for', 'tips to', 'how to crack', 'career advice', 'top 5', 'top 10',
      'cheatsheet', 'roadmap for', 'guide to', 'morning routine', 'my journey', 'how i got'
    ];
    const HIRING_ACTION_TERMS = [
      'hiring', 'vacancy', 'vacancies', 'opening', 'openings', "we're hiring", 'we are hiring', 'now hiring',
      'apply now', 'apply link', 'recruiting', 'walk-in', 'walk in', 'hiring drive', 'hiring interns',
      'link in bio', 'urgent hiring', 'immediate joining', 'internship opportunity', 'job opening',
      'recruitment', 'trainee', 'apprentice', 'fresher eligible', 'freshers eligible'
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
    let matchedRole = 'Not specified';
    for (const r of RuleClassifier.ROLES) {
      if (r.keywords.some(k => text.includes(k))) {
        matchedRole = r.label;
        break;
      }
    }
    if (matchedRole === 'Not specified' && matchedTerms.length >= 1) {
      matchedRole = 'Job Opportunity';
    }

    // Location Extraction
    let matchedLocation = 'India'; // Default to India if India or national keywords present, or generic candidate
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
    let experience = 'Freshers / Graduate Trainee';
    if (text.includes('fresher') || text.includes('freshers') || text.includes('0-1 year') || text.includes('0-2 year') || text.includes('0-2 yrs') || text.includes('0 years') || text.includes('no experience') || text.includes('entry level') || text.includes('trainee') || text.includes('apprentice')) {
      experience = '0-2 Years / Freshers / Trainee';
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
    } else if (text.includes('trainee') || text.includes('apprentice')) {
      employmentType = 'Trainee / Apprentice';
    }

    // Company Extraction (e.g. Cisco, Amazon, TCS, Infosys, etc.)
    let company = 'Not specified';
    const knownCompanies = ['cisco', 'amazon', 'tcs', 'infosys', 'wipro', 'accenture', 'cognizant', 'capgemini', 'deloitte', 'ey', 'pwc', 'kpmg', 'hcl', 'tech mahindra', 'swiggy', 'zomato', 'flipkart', 'google', 'microsoft'];
    for (const c of knownCompanies) {
      if (text.includes(c)) {
        company = c.toUpperCase();
        break;
      }
    }

    if (company === 'Not specified') {
      const companyMatch = rawText.match(/(?:at|company|hiring for|by|org|is hiring for)\s+([A-Z][A-Za-z0-9\s]{2,20})/i);
      if (companyMatch && companyMatch[1]) {
        company = companyMatch[1].trim();
      }
    }

    // Salary Extraction
    let salary = 'Not specified';
    const salaryMatch = rawText.match(/(\d+(?:\.\d+)?\s*(?:k|lpa|lakhs?|cpa|rs|inr|stipend))/i);
    if (salaryMatch) {
      salary = salaryMatch[0];
    }

    // Robust URL Extraction (Section 17: Multi-line, wrapping, clean parameters)
    const normalizedTextForUrls = rawText.replace(/[\r\n]+/g, ' ');
    const urlMatches = (normalizedTextForUrls.match(/(https?:\/\/[^\s\)\>\]"']+)/gi) || []);
    let applicationUrl: string | undefined = undefined;
    let interviewUrl: string | undefined = undefined;
    let testUrl: string | undefined = undefined;
    let externalUrl: string | undefined = undefined;

    for (const rawUrl of urlMatches) {
      const cleanUrl = rawUrl.replace(/[.,;:\)]$/, '').trim();
      const lowerUrl = cleanUrl.toLowerCase();
      if (lowerUrl.includes('test') || lowerUrl.includes('assessment') || lowerUrl.includes('hackerrank') || lowerUrl.includes('hackerearth') || lowerUrl.includes('testgorilla') || lowerUrl.includes('codility')) {
        testUrl = cleanUrl;
      } else if (lowerUrl.includes('interview') || lowerUrl.includes('walkin')) {
        interviewUrl = cleanUrl;
      } else if (lowerUrl.includes('apply') || lowerUrl.includes('forms.gle') || lowerUrl.includes('unstop') || lowerUrl.includes('linkedin.com/jobs') || lowerUrl.includes('careers') || lowerUrl.includes('cisco.com')) {
        applicationUrl = cleanUrl;
      } else if (!externalUrl) {
        externalUrl = cleanUrl;
      }
    }

    if (!applicationUrl && externalUrl) {
      applicationUrl = externalUrl;
    }

    const applicationLink = applicationUrl || (text.includes('link in bio') ? 'Link in bio' : 'Not specified');

    // Multi-Signal Relevance Scoring System (Section 18)
    let score = 0;
    const reasons: string[] = [];

    if (matchedRole !== 'Not specified') {
      score += 30;
      reasons.push(matchedRole);
    }
    if (HIRING_ACTION_TERMS.some(t => text.includes(t))) {
      score += 20;
      reasons.push('Hiring Call');
    }
    if (text.includes('fresher') || text.includes('trainee') || text.includes('apprentice') || text.includes('graduate')) {
      score += 15;
      reasons.push('Fresher/Trainee Eligible');
    }
    if (applicationUrl !== undefined || text.includes('link in bio') || text.includes('apply now')) {
      score += 15;
      reasons.push('Apply Link');
    }
    if (matchedLocation !== 'Not specified') {
      score += 15;
      reasons.push(matchedLocation);
    }
    if (salary !== 'Not specified') {
      score += 5;
    }

    let relevanceScore: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    if (score >= 60) {
      relevanceScore = 'HIGH';
    } else if (score >= 35) {
      relevanceScore = 'MEDIUM';
    } else {
      relevanceScore = 'LOW';
    }

    const relevanceReason = reasons.length > 0 ? reasons.slice(0, 3).join(' + ') : 'Matching Job Keywords';

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
      confidence: 0.90,
      relevanceScore
    };
  }
}
