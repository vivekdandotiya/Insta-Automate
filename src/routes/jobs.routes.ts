import { Router, Request, Response } from 'express';
import { prisma } from '../db/client.js';
import { formatIST, formatShortIST, getISTDateString, getISTDayBounds, getISTDateLabel } from '../utils/date.js';
import { AgentStateService } from '../services/agentState.service.js';
import { SchedulerService } from '../services/scheduler.service.js';
import { getMonitoredInstagramAccounts } from '../config/sources.config.js';

const router = Router();

/**
 * GET /api/jobs - Day-wise, filtered, searched, and paginated job alert list
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      date,
      fromDate,
      toDate,
      search,
      role,
      location,
      experience,
      workMode,
      employmentType,
      relevance,
      source,
      status,
      sort = 'newest_posted',
      page = '1',
      limit = '20'
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));

    const where: any = {
      classification: 'JOB_POST'
    };

    // User status filter (e.g. NEW, VIEWED, APPLIED, REGISTERED, IGNORED)
    if (status && String(status).trim() !== '') {
      where.user_status = String(status).toUpperCase();
    }

    // 1. Date Filtering (Day-wise in IST or 24h active window)
    let selectedDateStr = date ? String(date).trim() : 'today';
    if (selectedDateStr === 'today') {
      selectedDateStr = getISTDateString(new Date());
    }

    if (date || (!fromDate && !toDate)) {
      if (selectedDateStr === 'all') {
        // Return all jobs
      } else if (selectedDateStr === 'active24h') {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        where.published_at = { gte: twentyFourHoursAgo };
      } else {
        const { startUtc, endUtc } = getISTDayBounds(selectedDateStr);
        where.published_at = {
          gte: startUtc,
          lte: endUtc
        };
      }
    } else if (fromDate || toDate) {
      where.published_at = {};
      if (fromDate) {
        const { startUtc } = getISTDayBounds(String(fromDate));
        where.published_at.gte = startUtc;
      }
      if (toDate) {
        const { endUtc } = getISTDayBounds(String(toDate));
        where.published_at.lte = endUtc;
      }
    }

    // 2. Specific Property Filters
    if (relevance) {
      where.relevance_score = String(relevance).toUpperCase();
    }

    if (source) {
      const cleanSource = String(source).trim();
      where.source_account = cleanSource.startsWith('@') ? cleanSource : `@${cleanSource}`;
    }

    // 3. Search Query Filter
    if (search && String(search).trim() !== '') {
      const searchStr = String(search).trim();
      where.OR = [
        { source_account: { contains: searchStr, mode: 'insensitive' } },
        { post_url: { contains: searchStr, mode: 'insensitive' } },
        {
          job_alert: {
            OR: [
              { role: { contains: searchStr, mode: 'insensitive' } },
              { company: { contains: searchStr, mode: 'insensitive' } },
              { location: { contains: searchStr, mode: 'insensitive' } },
              { experience: { contains: searchStr, mode: 'insensitive' } },
              { work_mode: { contains: searchStr, mode: 'insensitive' } },
              { employment_type: { contains: searchStr, mode: 'insensitive' } },
              { skills: { contains: searchStr, mode: 'insensitive' } }
            ]
          }
        }
      ];
    }

    // Additional Relational JobAlert Filters
    if (role || location || experience || workMode || employmentType) {
      const alertFilter: any = {};
      if (role) alertFilter.role = { contains: String(role), mode: 'insensitive' };
      if (location) alertFilter.location = { contains: String(location), mode: 'insensitive' };
      if (experience) alertFilter.experience = { contains: String(experience), mode: 'insensitive' };
      if (workMode) alertFilter.work_mode = { contains: String(workMode), mode: 'insensitive' };
      if (employmentType) alertFilter.employment_type = { contains: String(employmentType), mode: 'insensitive' };

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { job_alert: alertFilter }];
        delete where.OR;
      } else {
        where.job_alert = alertFilter;
      }
    }

    // 4. Sorting logic
    let orderBy: any = { published_at: 'desc' };
    if (sort === 'oldest_posted') orderBy = { published_at: 'asc' };
    else if (sort === 'newest_detected') orderBy = { detected_at: 'desc' };
    else if (sort === 'highest_relevance') orderBy = [{ relevance_score: 'asc' }, { published_at: 'desc' }];

    // 5. Query Count & Paginated Items
    const [totalItems, posts] = await Promise.all([
      prisma.processedPost.count({ where }),
      prisma.processedPost.findMany({
        where,
        include: { job_alert: true },
        orderBy,
        skip: (pageNum - 1) * limitNum,
        take: limitNum
      })
    ]);

    // 6. Day Summary Statistics
    const [highCount, medCount, lowCount] = await Promise.all([
      prisma.processedPost.count({ where: { ...where, relevance_score: 'HIGH' } }),
      prisma.processedPost.count({ where: { ...where, relevance_score: 'MEDIUM' } }),
      prisma.processedPost.count({ where: { ...where, relevance_score: 'LOW' } })
    ]);

    const formattedJobs = posts.map(p => ({
      id: p.id,
      instagramPostId: p.instagram_post_id,
      instagramUrl: p.post_url,
      sourceAccount: p.source_account,
      sourceUsername: p.source_account.replace(/^@/, ''),
      caption: p.job_alert?.reason || p.classification,
      mediaType: p.post_type,
      company: p.job_alert?.company || 'Not specified',
      role: p.job_alert?.role || 'Not specified',
      location: p.job_alert?.location || 'Not specified',
      experience: p.job_alert?.experience || 'Not specified',
      salary: p.job_alert?.salary || 'Not specified',
      workMode: p.job_alert?.work_mode || 'Not specified',
      employmentType: p.job_alert?.employment_type || 'Not specified',
      applyUrl: p.job_alert?.application_link || 'Not specified',
      postedAt: p.published_at,
      postedAtFormatted: formatShortIST(p.published_at),
      detectedAt: p.detected_at,
      detectedAtFormatted: formatShortIST(p.detected_at),
      relevance: p.relevance_score,
      relevanceScore: p.relevance_score,
      processingStatus: p.processing_status,
      userStatus: p.user_status || 'NEW',
      expiresAt: p.expires_at,
      telegramSent: false,
      emailSent: false,
      createdAt: p.detected_at,
      updatedAt: p.processed_at || p.detected_at
    }));

    const totalPages = Math.ceil(totalItems / limitNum) || 1;

    res.json({
      success: true,
      date: selectedDateStr,
      dateLabel: selectedDateStr === 'active24h' ? 'Last 24 Hours' : getISTDateLabel(getISTDayBounds(selectedDateStr === 'all' ? getISTDateString(new Date()) : selectedDateStr).startUtc),
      timezone: 'Asia/Kolkata',
      data: {
        jobs: formattedJobs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalItems,
          totalPages
        },
        daySummary: {
          total: totalItems,
          highRelevance: highCount,
          mediumRelevance: medCount,
          lowRelevance: lowCount
        }
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/jobs/stats - Overall dashboard statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const todayStr = getISTDateString(new Date());
    const { startUtc, endUtc } = getISTDayBounds(todayStr);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      todaysJobsCount,
      newJobsCount,
      highRelevanceCount,
      totalPostsScanned,
      agentState
    ] = await Promise.all([
      prisma.processedPost.count({
        where: {
          classification: 'JOB_POST',
          published_at: { gte: startUtc, lte: endUtc }
        }
      }),
      prisma.processedPost.count({
        where: {
          classification: 'JOB_POST',
          published_at: { gte: twentyFourHoursAgo }
        }
      }),
      prisma.processedPost.count({
        where: { classification: 'JOB_POST', relevance_score: 'HIGH' }
      }),
      prisma.processedPost.count(),
      AgentStateService.getOrCreateAgentState()
    ]);

    const monitoredAccounts = getMonitoredInstagramAccounts().length;

    res.json({
      success: true,
      data: {
        todaysJobsCount,
        newJobsCount,
        highRelevanceCount,
        monitoredAccounts,
        totalPostsScanned,
        agentStatus: agentState.status,
        lastSuccessfulCheck: agentState.last_successful_check,
        lastSuccessfulCheckFormatted: agentState.last_successful_check ? formatIST(agentState.last_successful_check) : 'Never',
        agentStartTime: agentState.agent_start_time,
        agentStartTimeFormatted: formatIST(agentState.agent_start_time),
        lastError: agentState.last_error
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/jobs/history - List of available dates with job counts
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const posts = await prisma.processedPost.findMany({
      where: { classification: 'JOB_POST' },
      select: { published_at: true, relevance_score: true },
      orderBy: { published_at: 'desc' }
    });

    const dateMap = new Map<string, { date: string; label: string; count: number; highRelevance: number }>();

    for (const post of posts) {
      const dateStr = getISTDateString(post.published_at);
      if (!dateStr) continue;

      const existing = dateMap.get(dateStr) || {
        date: dateStr,
        label: getISTDateLabel(post.published_at),
        count: 0,
        highRelevance: 0
      };

      existing.count++;
      if (post.relevance_score === 'HIGH') {
        existing.highRelevance++;
      }
      dateMap.set(dateStr, existing);
    }

    const history = Array.from(dateMap.values());

    res.json({
      success: true,
      data: history
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/jobs/:id - Single job details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const p = await prisma.processedPost.findUnique({
      where: { id },
      include: { job_alert: true }
    });

    if (!p) {
      return res.status(404).json({ success: false, error: 'Job alert record not found' });
    }

    res.json({
      success: true,
      data: {
        id: p.id,
        instagramPostId: p.instagram_post_id,
        instagramUrl: p.post_url,
        sourceAccount: p.source_account,
        sourceUsername: p.source_account.replace(/^@/, ''),
        caption: p.job_alert?.reason || p.classification,
        mediaType: p.post_type,
        company: p.job_alert?.company || 'Not specified',
        role: p.job_alert?.role || 'Not specified',
        location: p.job_alert?.location || 'Not specified',
        experience: p.job_alert?.experience || 'Not specified',
        salary: p.job_alert?.salary || 'Not specified',
        workMode: p.job_alert?.work_mode || 'Not specified',
        employmentType: p.job_alert?.employment_type || 'Not specified',
        applyUrl: p.job_alert?.application_link || 'Not specified',
        postedAt: p.published_at,
        postedAtFormatted: formatIST(p.published_at),
        detectedAt: p.detected_at,
        detectedAtFormatted: formatIST(p.detected_at),
        relevance: p.relevance_score,
        relevanceScore: p.relevance_score,
        processingStatus: p.processing_status,
        userStatus: p.user_status || 'NEW',
        expiresAt: p.expires_at,
        telegramSent: false,
        emailSent: false,
        createdAt: p.detected_at,
        updatedAt: p.processed_at || p.detected_at
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/jobs/:id/status - Update job application / user status (Requirement 12)
 */
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['NEW', 'VIEWED', 'APPLIED', 'REGISTERED', 'IGNORED'];
    if (!status || !validStatuses.includes(String(status).toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const updated = await prisma.processedPost.update({
      where: { id },
      data: { user_status: String(status).toUpperCase() }
    });

    res.json({
      success: true,
      message: `Job status updated to ${updated.user_status}`,
      data: { id: updated.id, userStatus: updated.user_status }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/jobs/scan-status - Retrieve current scan status & last scan result
 */
router.get('/scan-status', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: SchedulerService.getScanStatus()
  });
});

/**
 * POST /api/jobs/scan - Manual trigger check cycle (Requirement 1 & 15)
 */
router.post('/scan', async (req: Request, res: Response) => {
  console.log(`[SCAN REQUEST] POST /api/jobs/scan received from ${req.ip || 'unknown'}`);
  console.log(`[SCAN REQUEST] User-Agent: ${req.get('user-agent') || 'none'}`);
  console.log(`[SCAN REQUEST] Origin: ${req.get('origin') || 'none'}`);

  try {
    if (SchedulerService.isRunning) {
      console.log('[SCAN REQUEST] Scan already in progress. Returning background status.');
      return res.json({
        success: true,
        message: 'Scan cycle already in progress',
        data: SchedulerService.getScanStatus()
      });
    }

    // Race execution for up to 20 seconds to return fast sync response or delegate to background
    const scanPromise = SchedulerService.executeCheckCycle();

    let isTimedOut = false;
    const timeoutPromise = new Promise<'TIMEOUT'>((resolve) => {
      setTimeout(() => {
        isTimedOut = true;
        resolve('TIMEOUT');
      }, 20000);
    });

    const result = await Promise.race([scanPromise, timeoutPromise]);

    if (result === 'TIMEOUT' || isTimedOut) {
      console.log('[SCAN REQUEST] Scan taking longer than 20s. Returning background status response.');
      return res.json({
        success: true,
        message: 'Scan cycle started in background',
        data: SchedulerService.getScanStatus()
      });
    }

    console.log('[SCAN REQUEST] Scan completed synchronously.');
    return res.json({
      success: true,
      message: 'Instagram job scan cycle completed',
      data: result
    });
  } catch (err: any) {
    console.error(`[SCAN REQUEST ERROR] ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
