import { Request, Response, NextFunction } from 'express';

export async function getActiveCampaigns(req: Request, res: Response, next: NextFunction) {
  try {
    return res.json({
      success: true,
      campaigns: [
        {
          id: 'camp_1',
          title: 'Pan-African Women Health Awareness Initiative',
          partnerOrg: 'African Women Health Foundation',
          startDate: '2026-07-01',
          endDate: '2026-12-31',
        },
      ],
    });
  } catch (error) {
    next(error);
  }
}
