export interface RawInstagramPost {
  id: string; // instagram_post_id (e.g., 'C123456789')
  sourceAccount: string; // e.g. '@tech_jobs_india'
  postUrl: string;
  postType: 'POST' | 'REEL' | 'IMAGE' | 'VIDEO';
  caption: string;
  mediaUrls: string[];
  publishedAt: Date;
  hashtags: string[];
}

export interface InstagramAdapter {
  fetchLatestPosts(sourceAccount: string): Promise<RawInstagramPost[]>;
}
