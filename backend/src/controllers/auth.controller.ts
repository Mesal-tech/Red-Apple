import { Request, Response, NextFunction } from 'express';

export async function registerUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, phone, password } = req.body;
    if (!email && !phone) {
      return res.status(400).json({ error: 'Email or phone number is required.' });
    }

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: 'usr_' + Date.now(),
        name,
        email,
        phone,
      },
      tokens: {
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function loginUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    return res.json({
      success: true,
      user: {
        id: 'usr_123',
        name: 'Sophia Chen',
        email,
      },
      tokens: {
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    return res.json({
      accessToken: 'new_mock_access_token',
    });
  } catch (error) {
    next(error);
  }
}
