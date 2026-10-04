import { prisma } from '../db/client.js';
import { logger } from '../utils/logger.js';
import { JobClassificationResult } from './classifier.interface.js';

export interface UserPreferences {
  roles: string[];
  locations: string[];
  experienceLevels: string[];
  minRelevance: 'HIGH' | 'MEDIUM' | 'LOW';
  notificationMode: string;
}

export class FilterService {
  /**
   * Normalize location variations
   */
  public static normalizeLocation(location: string): string[] {
    const locLower = location.toLowerCase();
    const result: string[] = [location];

    if (locLower.includes('gurgaon') || locLower.includes('gurugram')) {
      result.push('Gurgaon', 'Gurugram');
    }
    if (locLower.includes('noida')) {
      result.push('Noida', 'Greater Noida');
    }
    if (locLower.includes('delhi')) {
      result.push('Delhi', 'New Delhi', 'Delhi NCR');
    }
    if (locLower.includes('ghaziabad')) {
      result.push('Ghaziabad', 'Delhi NCR');
    }
    if (locLower.includes('faridabad')) {
      result.push('Faridabad', 'Delhi NCR');
    }
    if (locLower.includes('delhi ncr') || locLower.includes('ncr')) {
      result.push('Delhi', 'New Delhi', 'Delhi NCR', 'Noida', 'Gurgaon', 'Gurugram', 'Greater Noida', 'Ghaziabad', 'Faridabad');
    }
    if (locLower.includes('remote') || locLower.includes('work from home') || locLower.includes('wfh')) {
      result.push('Remote');
    }
    if (locLower.includes('pan india') || locLower.includes('india') || locLower.includes('across india')) {
      result.push('Pan India', 'India');
    }

    return Array.from(new Set(result));
  }

  /**
   * Get active user preferences from database
   */
  public static async getUserPreferences(): Promise<UserPreferences> {
    let pref = await prisma.userPreference.findUnique({ where: { id: 1 } });
    if (!pref) {
      pref = await prisma.userPreference.create({
        data: { id: 1 }
      });
    }

    return {
      roles: JSON.parse(pref.roles),
      locations: JSON.parse(pref.locations),
      experienceLevels: JSON.parse(pref.experience_levels),
      minRelevance: pref.min_relevance as any,
      notificationMode: pref.notification_mode
    };
  }

  /**
   * Save updated preferences
   */
  public static async updateUserPreferences(data: Partial<UserPreferences>) {
    const updateData: any = {};
    if (data.roles) updateData.roles = JSON.stringify(data.roles);
    if (data.locations) updateData.locations = JSON.stringify(data.locations);
    if (data.experienceLevels) updateData.experience_levels = JSON.stringify(data.experienceLevels);
    if (data.minRelevance) updateData.min_relevance = data.minRelevance;
    if (data.notificationMode) updateData.notification_mode = data.notificationMode;

    return prisma.userPreference.update({
      where: { id: 1 },
      data: updateData
    });
  }

  /**
   * Match job against user preferences
   */
  public static async isMatch(job: JobClassificationResult): Promise<{ matches: boolean; reason: string }> {
    if (!job.isJobPost) {
      return { matches: false, reason: 'Not a job post' };
    }

    const prefs = await FilterService.getUserPreferences();

    // 1. Check Relevance Threshold
    const relevanceLevels = { HIGH: 3, MEDIUM: 2, LOW: 1, IRRELEVANT: 0 };
    const jobLevel = relevanceLevels[job.relevanceScore] || 0;
    const minLevel = relevanceLevels[prefs.minRelevance] || 2;

    if (jobLevel < minLevel) {
      return {
        matches: false,
        reason: `Relevance (${job.relevanceScore}) is below minimum configured threshold (${prefs.minRelevance})`
      };
    }

    // 2. Check Role Match
    const jobRoleLower = job.role.toLowerCase();
    const roleMatches = prefs.roles.some(userRole => {
      const ur = userRole.toLowerCase();
      return jobRoleLower.includes(ur) || ur.includes(jobRoleLower);
    });

    // 3. Check Location Match (with synonyms)
    const normalizedJobLocs = FilterService.normalizeLocation(job.location);
    const locationMatches = prefs.locations.some(userLoc => {
      const ul = userLoc.toLowerCase();
      return normalizedJobLocs.some(nLoc => nLoc.toLowerCase().includes(ul) || ul.includes(nLoc.toLowerCase()));
    });

    if (!roleMatches && !locationMatches) {
      return { matches: false, reason: 'Job role and location do not match user preferences' };
    }

    logger.info(`[FILTER SERVICE] Match confirmed for role "${job.role}" in "${job.location}" (Score: ${job.relevanceScore})`);
    return { matches: true, reason: 'Role and location match user preferences' };
  }
}
