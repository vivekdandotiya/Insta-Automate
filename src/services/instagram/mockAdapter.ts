import { InstagramAdapter, RawInstagramPost } from './adapter.interface.js';
import { logger } from '../../utils/logger.js';

export class MockInstagramAdapter implements InstagramAdapter {
  private static dynamicPosts: RawInstagramPost[] = [];

  /**
   * Helper to insert a mock post dynamically (useful for test endpoints)
   */
  public static addMockPost(post: RawInstagramPost) {
    MockInstagramAdapter.dynamicPosts.unshift(post);
  }

  public async fetchLatestPosts(sourceAccount: string): Promise<RawInstagramPost[]> {
    logger.info(`[MOCK INSTAGRAM ADAPTER] Fetching latest posts for source: ${sourceAccount}`);

    const now = new Date();
    
    // Default mock dataset with posts before, around, and after typical start time
    const staticPosts: RawInstagramPost[] = [
      {
        id: `mock_post_101_${sourceAccount.replace('@', '')}`,
        sourceAccount,
        postUrl: `https://www.instagram.com/p/C_JOB_01/`,
        postType: 'POST',
        caption: `🚨 HIRING ALERT! ABC Technologies is hiring Full Stack Developers in Noida / Delhi NCR.\nRole: Full Stack Engineer (React + Node.js)\nLocation: Noida / Hybrid\nExperience: 0-2 Years (Freshers can apply!)\nSalary: 6-8 LPA\nWork Mode: Hybrid\nApply link in bio or visit https://abctech.careers/job/101`,
        mediaUrls: ['https://images.unsplash.com/photo-1516321318423-f06f85e504b3'],
        publishedAt: new Date(now.getTime() - 2 * 60 * 1000), // 2 minutes ago (NEW post)
        hashtags: ['#hiring', '#fullstack', '#noida', '#freshers']
      },
      {
        id: `mock_reel_102_${sourceAccount.replace('@', '')}`,
        sourceAccount,
        postUrl: `https://www.instagram.com/reel/C_REEL_02/`,
        postType: 'REEL',
        caption: `We are Hiring Frontend Engineers (React / Next.js) in Gurgaon / Gurugram!\nCompany: Zenith Software Services\nExperience: 1-3 Years\nLocation: Gurugram, Haryana\nRequirements: Strong JS, React, Tailwind CSS.\nDirect Walk-in Interview on Saturday! Apply now: https://zenithtech.io/careers`,
        mediaUrls: [],
        publishedAt: new Date(now.getTime() - 5 * 60 * 1000), // 5 minutes ago (NEW post)
        hashtags: ['#hiringalert', '#reactjs', '#gurgaon', '#jobopening']
      },
      {
        id: `mock_post_103_${sourceAccount.replace('@', '')}`,
        sourceAccount,
        postUrl: `https://www.instagram.com/p/C_JOB_03/`,
        postType: 'POST',
        caption: `Urgent Requirement: BDE / Business Development Executive in Delhi NCR.\nCompany: Global Sales Corp\nExperience: Freshers / 0-1 Year\nLocation: New Delhi\nRemuneration: 3.5 LPA + Incentives.\nImmediate Joiners preferred!`,
        mediaUrls: [],
        publishedAt: new Date(now.getTime() - 15 * 60 * 1000), // 15 minutes ago
        hashtags: ['#bdejobs', '#delhijobs', '#sales']
      },
      {
        id: `mock_old_104_${sourceAccount.replace('@', '')}`,
        sourceAccount,
        postUrl: `https://www.instagram.com/p/C_OLD_04/`,
        postType: 'POST',
        caption: `Throwback to our annual team outing! Work hard, party harder! 🚀 #companyculture #techlife`,
        mediaUrls: [],
        publishedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago (OLD post)
        hashtags: ['#culture', '#team']
      },
      {
        id: `mock_irrelevant_105_${sourceAccount.replace('@', '')}`,
        sourceAccount,
        postUrl: `https://www.instagram.com/p/C_NOTJOB_05/`,
        postType: 'POST',
        caption: `5 tips to crack coding interviews in 2026! 💡 Save this post for later. 1. Practice DSA 2. Build projects 3. Mock interviews.`,
        mediaUrls: [],
        publishedAt: new Date(now.getTime() - 1 * 60 * 1000), // 1 minute ago (IRRELEVANT non-job post)
        hashtags: ['#careeradvice', '#codingtips']
      }
    ];

    // Merge static and dynamically injected mock posts for testing
    return [...MockInstagramAdapter.dynamicPosts, ...staticPosts];
  }
}
