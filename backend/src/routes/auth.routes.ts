import { Router } from 'express';
import {
  registerUser,
  loginUser,
  googleAuth,
  appleAuth,
  refreshToken,
  logoutUser,
  getCurrentUser,
  updateProfile,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Public authentication routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleAuth);
router.post('/apple', appleAuth);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Google OAuth Web Callback Bridge
router.get('/google/callback', (req, res) => {
  console.log('[OAUTH] Google callback endpoint hit from IP:', req.ip, 'Query:', req.query);
  res.send(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Red Apple Authentication</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #0C0103;
        color: white;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        margin: 0;
        padding: 24px;
        box-sizing: border-box;
        text-align: center;
      }
      .spinner {
        width: 48px;
        height: 48px;
        border: 4px solid rgba(220, 38, 38, 0.2);
        border-top-color: #DC2626;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin-bottom: 24px;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      h2 { margin: 0 0 8px; font-weight: 800; font-size: 22px; }
      p { color: rgba(255, 255, 255, 0.6); margin: 0 0 24px; font-size: 14px; }
      .return-btn {
        display: none;
        background: linear-gradient(135deg, #DC2626, #991B1B);
        color: white;
        text-decoration: none;
        padding: 14px 28px;
        border-radius: 28px;
        font-weight: 700;
        font-size: 15px;
        box-shadow: 0 6px 20px rgba(220, 38, 38, 0.4);
        transition: transform 0.2s;
      }
      .return-btn:active {
        transform: scale(0.98);
      }
    </style>
  </head>
  <body>
    <div class="spinner" id="spinner"></div>
    <h2>Authenticating with Red Apple</h2>
    <p id="status-text">Returning to the app...</p>
    <a href="#" id="return-btn" class="return-btn">Return to Red Apple</a>

    <script>
      (function() {
        var hash = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : window.location.hash;
        var search = window.location.search.startsWith('?') ? window.location.search.substring(1) : window.location.search;
        var rawPayload = hash || search;

        // Parse search & hash parameters
        var params = {};
        if (rawPayload) {
          rawPayload.split('&').forEach(function(part) {
            var item = part.split('=');
            if (item[0]) {
              params[decodeURIComponent(item[0])] = decodeURIComponent(item[1] || '');
            }
          });
        }

        // Determine return URL (supports Expo Go exp:// scheme or standalone redapple://)
        var returnUrl = 'redapple://oauthredirect';
        if (params.state) {
          try {
            returnUrl = decodeURIComponent(params.state);
          } catch(e) {
            returnUrl = params.state;
          }
        }

        var delimiter = returnUrl.indexOf('?') !== -1 ? '&' : '?';
        var targetUrl = returnUrl + delimiter + rawPayload;

        var btn = document.getElementById('return-btn');
        btn.href = targetUrl;
        btn.style.display = 'inline-block';

        // Auto trigger deep link
        try {
          window.location.href = targetUrl;
        } catch (e) {}

        setTimeout(function() {
          try {
            window.location.href = targetUrl;
          } catch (e) {}
        }, 300);
      })();
    </script>
  </body>
</html>`);
});

// Protected routes (strictly requires valid Bearer token, zero bypass)
router.get('/me', authenticateToken, getCurrentUser);
router.put('/profile', authenticateToken, updateProfile);
router.post('/logout', authenticateToken, logoutUser);

export default router;
