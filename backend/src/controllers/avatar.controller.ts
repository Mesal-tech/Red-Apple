import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { uploadAvatar } from '../services/r2Storage.service';

export async function uploadUserAvatar(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user?.userId) return res.status(401).json({ success: false, error: 'Authentication required.' });
    if (!req.file) return res.status(400).json({ success: false, error: 'Choose an image to upload.' });
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(req.file.mimetype)) {
      return res.status(415).json({ success: false, error: { code: 'UNSUPPORTED_IMAGE_TYPE', message: 'Choose a JPEG, PNG, or WebP image.' } });
    }

    const avatar = await uploadAvatar(req.user.userId, req.file.buffer, req.file.mimetype);
    return res.status(201).json({ success: true, avatarUrl: avatar.url });
  } catch (error) {
    next(error);
  }
}
