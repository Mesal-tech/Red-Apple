import jwt from 'jsonwebtoken';
import https from 'https';
import { config } from '../config';

export interface VerifiedGoogleUser {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

export interface VerifiedAppleUser {
  appleId: string;
  email?: string;
  name?: string;
}

export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleUser> {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Google ID token is required.');
  }

  // Verify against Google's tokeninfo API
  return new Promise((resolve, reject) => {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            return reject(new Error('Invalid Google token: ' + data));
          }

          const payload = JSON.parse(data);

          if (!payload.email) {
            return reject(new Error('Google token did not return an email address.'));
          }

          if (config.oauth.googleClientId && payload.aud !== config.oauth.googleClientId) {
            return reject(new Error('Google token audience does not match configured Client ID.'));
          }

          resolve({
            googleId: payload.sub,
            email: payload.email.toLowerCase(),
            name: payload.name || payload.email.split('@')[0],
            picture: payload.picture,
          });
        } catch (err: any) {
          reject(new Error('Failed to parse Google token response: ' + err.message));
        }
      });
    }).on('error', (err) => {
      reject(new Error('Network error verifying Google token: ' + err.message));
    });
  });
}

export async function verifyAppleIdentityToken(identityToken: string): Promise<VerifiedAppleUser> {
  if (!identityToken || typeof identityToken !== 'string') {
    throw new Error('Apple identity token is required.');
  }

  // Apple identity tokens are signed JWTs with issuer https://appleid.apple.com
  const decoded = jwt.decode(identityToken, { complete: true });
  if (!decoded || typeof decoded !== 'object' || !decoded.payload) {
    throw new Error('Malformed Apple identity token.');
  }

  const payload = decoded.payload as any;

  if (payload.iss !== 'https://appleid.apple.com') {
    throw new Error('Invalid Apple token issuer.');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('Apple identity token has expired.');
  }

  if (config.oauth.appleClientId && payload.aud !== config.oauth.appleClientId) {
    throw new Error('Apple token audience does not match configured Client ID.');
  }

  return {
    appleId: payload.sub,
    email: payload.email ? payload.email.toLowerCase() : undefined,
  };
}
