import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { userStore } from '../data/user.store';
import prisma from '../db/prisma';
import { calculateFertilityPrediction } from '../utils/cycleCalculators';

interface PartnerSyncPreferences {
  shareFertileWindow: boolean;
  shareCyclePhase: boolean;
  shareSymptoms: boolean;
  shareDailyTips: boolean;
}

const DEFAULT_PREFERENCES: PartnerSyncPreferences = {
  shareFertileWindow: true,
  shareCyclePhase: true,
  shareSymptoms: true,
  shareDailyTips: true,
};

function generateInviteCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let prefix = '';
  for (let i = 0; i < 4; i++) {
    prefix += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `RED-${prefix}-${digits}`;
}

/**
 * GET /api/partner/status
 * Retrieve authenticated user's partner sync profile & status.
 */
export async function getPartnerStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const user = await userStore.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const hp = (user.health_profile as any) || {};
    let partnerSync = hp.partner_sync;

    // Initialize partner_sync if not yet created
    if (!partnerSync || !partnerSync.inviteCode) {
      const inviteCode = generateInviteCode();
      partnerSync = {
        inviteCode,
        status: 'none',
        cardDismissed: false,
        preferences: DEFAULT_PREFERENCES,
        ...(partnerSync || {}),
      };

      await userStore.updateUser(userId, {
        health_profile: {
          ...hp,
          partner_sync: partnerSync,
        },
      });
    }

    // If connected to a partner, verify partner user exists and fetch public info
    let partnerInfo = null;
    if (partnerSync.status === 'connected' && partnerSync.partnerUserId) {
      const partnerUser = await userStore.findById(partnerSync.partnerUserId);
      if (partnerUser) {
        partnerInfo = {
          userId: partnerUser.user_id,
          name: partnerUser.name,
          email: partnerUser.email,
          avatarUrl: partnerUser.avatar_url || (partnerUser.health_profile as any)?.avatarUrl,
        };
      } else {
        // Partner was deleted or not found
        partnerSync.status = 'none';
        delete partnerSync.partnerUserId;
      }
    }

    return res.json({
      success: true,
      partnerSync: {
        inviteCode: partnerSync.inviteCode,
        status: partnerSync.status || 'none',
        partnerName: partnerSync.partnerName || partnerInfo?.name,
        partnerEmail: partnerSync.partnerEmail || partnerInfo?.email,
        partnerAvatarUrl: partnerSync.partnerAvatarUrl || partnerInfo?.avatarUrl,
        cardDismissed: !!partnerSync.cardDismissed,
        connectedAt: partnerSync.connectedAt,
        inviteSentAt: partnerSync.inviteSentAt,
        preferences: partnerSync.preferences || DEFAULT_PREFERENCES,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/partner/invite
 * Generate or send a partner invitation.
 */
export async function sendPartnerInvite(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const user = await userStore.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const { partnerName, partnerEmail, partnerPhone, preferences } = req.body;

    const hp = (user.health_profile as any) || {};
    let partnerSync = hp.partner_sync || {};

    if (!partnerSync.inviteCode) {
      partnerSync.inviteCode = generateInviteCode();
    }

    partnerSync = {
      ...partnerSync,
      status: partnerEmail || partnerPhone ? 'pending' : 'none',
      partnerName: partnerName ? String(partnerName).trim() : partnerSync.partnerName,
      partnerEmail: partnerEmail ? String(partnerEmail).trim().toLowerCase() : partnerSync.partnerEmail,
      partnerPhone: partnerPhone ? String(partnerPhone).trim() : partnerSync.partnerPhone,
      inviteSentAt: new Date().toISOString(),
      cardDismissed: false,
      preferences: preferences ? { ...DEFAULT_PREFERENCES, ...preferences } : partnerSync.preferences || DEFAULT_PREFERENCES,
    };

    await userStore.updateUser(userId, {
      health_profile: {
        ...hp,
        partner_sync: partnerSync,
      },
    });

    const shareUrl = `https://redapple.app/partner/join?code=${encodeURIComponent(partnerSync.inviteCode)}`;
    const shareMessage = `Join me on Red Apple to sync our cycle rhythm, fertility windows, and wellness moments! Use my invite code: ${partnerSync.inviteCode} or join here: ${shareUrl}`;

    return res.json({
      success: true,
      message: partnerEmail ? `Invitation prepared for ${partnerEmail}` : 'Invite code generated successfully',
      inviteCode: partnerSync.inviteCode,
      shareUrl,
      shareMessage,
      partnerSync,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/partner/accept
 * Accept an invite code to link accounts.
 */
export async function acceptPartnerInvite(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { inviteCode } = req.body;
    if (!inviteCode || typeof inviteCode !== 'string') {
      return res.status(400).json({ success: false, error: 'Please provide a valid invite code.' });
    }

    const cleanCode = inviteCode.trim().toUpperCase();

    const currentUser = await userStore.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ success: false, error: 'Current user not found.' });
    }

    // Find the inviter user who holds this invite code
    const allUsers = await prisma.user.findMany();
    const inviterPrisma = allUsers.find((u) => {
      const hp = (u.health_profile as any) || {};
      return (
        u.user_id !== userId &&
        hp.partner_sync &&
        hp.partner_sync.inviteCode?.toUpperCase() === cleanCode
      );
    });

    if (!inviterPrisma) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired invite code. Please check with your partner.',
      });
    }

    const inviterId = inviterPrisma.user_id;
    const inviterUser = await userStore.findById(inviterId);
    if (!inviterUser) {
      return res.status(404).json({ success: false, error: 'Partner account not found.' });
    }

    const now = new Date().toISOString();

    // 1. Update current user partner sync
    const currentHp = (currentUser.health_profile as any) || {};
    const currentUserPartnerSync = {
      ...(currentHp.partner_sync || {}),
      inviteCode: currentHp.partner_sync?.inviteCode || generateInviteCode(),
      status: 'connected',
      partnerUserId: inviterUser.user_id,
      partnerName: inviterUser.name,
      partnerEmail: inviterUser.email,
      partnerAvatarUrl: inviterUser.avatar_url || (inviterUser.health_profile as any)?.avatarUrl,
      connectedAt: now,
      cardDismissed: false,
      preferences: currentHp.partner_sync?.preferences || DEFAULT_PREFERENCES,
    };

    await userStore.updateUser(userId, {
      health_profile: {
        ...currentHp,
        partner_sync: currentUserPartnerSync,
      },
    });

    // 2. Update inviter's partner sync symmetrically
    const inviterHp = (inviterUser.health_profile as any) || {};
    const inviterPartnerSync = {
      ...(inviterHp.partner_sync || {}),
      status: 'connected',
      partnerUserId: currentUser.user_id,
      partnerName: currentUser.name,
      partnerEmail: currentUser.email,
      partnerAvatarUrl: currentUser.avatar_url || (currentUser.health_profile as any)?.avatarUrl,
      connectedAt: now,
      cardDismissed: false,
      preferences: inviterHp.partner_sync?.preferences || DEFAULT_PREFERENCES,
    };

    await userStore.updateUser(inviterId, {
      health_profile: {
        ...inviterHp,
        partner_sync: inviterPartnerSync,
      },
    });

    return res.json({
      success: true,
      message: `Successfully connected with ${inviterUser.name}!`,
      partnerSync: currentUserPartnerSync,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/partner/unlink
 * Unlinks the connected partner.
 */
export async function unlinkPartner(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const currentUser = await userStore.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const currentHp = (currentUser.health_profile as any) || {};
    const currentSync = currentHp.partner_sync || {};
    const partnerUserId = currentSync.partnerUserId;

    // Reset current user
    const updatedSync = {
      inviteCode: currentSync.inviteCode || generateInviteCode(),
      status: 'none',
      preferences: currentSync.preferences || DEFAULT_PREFERENCES,
      cardDismissed: false,
    };

    await userStore.updateUser(userId, {
      health_profile: {
        ...currentHp,
        partner_sync: updatedSync,
      },
    });

    // If partner exists, reset their sync as well
    if (partnerUserId) {
      const partnerUser = await userStore.findById(partnerUserId);
      if (partnerUser) {
        const partnerHp = (partnerUser.health_profile as any) || {};
        const pSync = partnerHp.partner_sync || {};
        await userStore.updateUser(partnerUserId, {
          health_profile: {
            ...partnerHp,
            partner_sync: {
              inviteCode: pSync.inviteCode || generateInviteCode(),
              status: 'none',
              preferences: pSync.preferences || DEFAULT_PREFERENCES,
              cardDismissed: false,
            },
          },
        });
      }
    }

    return res.json({
      success: true,
      message: 'Partner unlinked successfully.',
      partnerSync: updatedSync,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/partner/preferences
 * Update sharing permissions with partner.
 */
export async function updatePartnerPreferences(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { preferences } = req.body;
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid preferences object.' });
    }

    const user = await userStore.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const hp = (user.health_profile as any) || {};
    const currentSync = hp.partner_sync || {};

    const updatedSync = {
      ...currentSync,
      preferences: {
        ...(currentSync.preferences || DEFAULT_PREFERENCES),
        ...preferences,
      },
    };

    await userStore.updateUser(userId, {
      health_profile: {
        ...hp,
        partner_sync: updatedSync,
      },
    });

    return res.json({
      success: true,
      message: 'Sharing preferences updated.',
      preferences: updatedSync.preferences,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/partner/dismiss-card
 * Dismiss or restore the partner card visibility.
 */
export async function toggleDismissPartnerCard(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { dismissed = true } = req.body;

    const user = await userStore.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const hp = (user.health_profile as any) || {};
    const currentSync = hp.partner_sync || {};

    const updatedSync = {
      ...currentSync,
      cardDismissed: Boolean(dismissed),
    };

    await userStore.updateUser(userId, {
      health_profile: {
        ...hp,
        partner_sync: updatedSync,
      },
    });

    return res.json({
      success: true,
      cardDismissed: updatedSync.cardDismissed,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/partner/partner-cycle
 * Get shared cycle data from the connected partner based on their sharing preferences.
 */
export async function getPartnerCycleData(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const user = await userStore.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const hp = (user.health_profile as any) || {};
    const partnerSync = hp.partner_sync;

    if (!partnerSync || partnerSync.status !== 'connected' || !partnerSync.partnerUserId) {
      return res.json({
        success: true,
        connected: false,
        partnerCycle: null,
      });
    }

    const partnerUser = await userStore.findById(partnerSync.partnerUserId);
    if (!partnerUser) {
      return res.json({
        success: true,
        connected: false,
        partnerCycle: null,
      });
    }

    const partnerHp = (partnerUser.health_profile as any) || {};
    const partnerSyncConfig = partnerHp.partner_sync?.preferences || DEFAULT_PREFERENCES;

    const baselineCycleLength = Number(partnerHp.cycleLength) || 28;
    const baselinePeriodDuration = Number(partnerHp.periodDuration) || 5;
    const lastPeriodStartDate = partnerHp.lastPeriodDate || new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0];

    const prediction = calculateFertilityPrediction(
      lastPeriodStartDate,
      baselinePeriodDuration,
      baselineCycleLength
    );

    const now = new Date();
    const lpd = new Date(lastPeriodStartDate);
    const dayDiff = Math.floor((now.getTime() - lpd.getTime()) / (1000 * 60 * 60 * 24));
    const currentDay = ((dayDiff % baselineCycleLength) + baselineCycleLength) % baselineCycleLength + 1;

    const sharedData: any = {
      connected: true,
      partnerName: partnerUser.name,
      partnerAvatarUrl: partnerUser.avatar_url || partnerHp.avatarUrl,
      currentDay: partnerSyncConfig.shareCyclePhase ? currentDay : null,
      currentPhase: partnerSyncConfig.shareCyclePhase ? prediction.currentPhase : null,
      nextPeriodStartDate: partnerSyncConfig.shareCyclePhase ? prediction.nextPeriodStartDate : null,
      isFertileWindow: partnerSyncConfig.shareFertileWindow ? prediction.isFertileWindow : null,
      fertileWindowStart: partnerSyncConfig.shareFertileWindow ? prediction.fertileWindowStart : null,
      fertileWindowEnd: partnerSyncConfig.shareFertileWindow ? prediction.fertileWindowEnd : null,
      ovulationDate: partnerSyncConfig.shareFertileWindow ? prediction.estimatedOvulationDate : null,
      conceptionChance: partnerSyncConfig.shareFertileWindow ? prediction.chanceOfPregnancy : null,
      dailyTipForPartner: partnerSyncConfig.shareDailyTips
        ? prediction.currentPhase === 'Menstrual'
          ? 'Comfort and hydration are key today. Offering a warm tea or gentle support means a lot!'
          : prediction.currentPhase === 'Ovulation'
          ? 'Energy and intimacy are naturally high during this fertile window!'
          : prediction.currentPhase === 'Luteal'
          ? 'Progesterone is rising. Extra calm, understanding, and nutritious snacks help!'
          : 'Energy is rejuvenating today as the follicular phase begins!'
        : null,
    };

    return res.json({
      success: true,
      partnerCycle: sharedData,
    });
  } catch (error) {
    next(error);
  }
}
