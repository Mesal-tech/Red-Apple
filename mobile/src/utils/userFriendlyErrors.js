const TECHNICAL_MESSAGE = /\b(backend|database|postgres|prisma|sql|query|stack trace|internal server|ECONN|ETIMEDOUT|EACCES|P2010|P2028|fetch failed|network request failed|HTTP \d{3}|JSON|unexpected token|invalid server response)\b/i;

function getAction(endpoint = '') {
  if (endpoint.includes('/auth/avatar')) return 'photo';
  if (endpoint.includes('/auth/profile')) return 'profile';
  if (endpoint.includes('/auth/login')) return 'login';
  return 'request';
}

function safeServerMessage(message) {
  if (typeof message !== 'string') return null;
  const clean = message.trim();
  if (!clean || clean.length > 160 || TECHNICAL_MESSAGE.test(clean)) return null;
  return clean;
}

export function userFriendlyError(error, actionOverride) {
  if (error?.userMessage) return error.userMessage;

  const endpoint = error?.endpoint || '';
  const inferredAction = getAction(endpoint);
  const action = inferredAction !== 'request' ? inferredAction : (actionOverride || inferredAction);
  const status = Number(error?.status || error?.response?.status || 0);
  const raw = error?.serverMessage || error?.message || '';
  const message = String(raw).toLowerCase();

  if (error?.code === 'AVATAR_STORAGE_UNAVAILABLE') {
    return 'Photo uploads aren’t available right now. You can choose one of the preset avatars instead.';
  }
  if (error?.code === 'PHOTO_TOO_LARGE') return 'That photo is too large. Choose a photo smaller than 5 MB.';
  if (error?.code === 'UNSUPPORTED_IMAGE_TYPE') return 'Choose a JPG, PNG, or WebP photo.';

  if (status === 401) {
    if (action === 'login') return 'Those sign-in details don’t match. Check your email and password, then try again.';
    return 'Your sign-in has expired. Please sign in again to continue.';
  }
  if (status === 403) return 'You don’t have permission to do that.';
  if (status === 404) {
    if (action === 'profile') return 'We couldn’t find your profile. Please sign in again and try once more.';
    return 'We couldn’t find that information. Refresh and try again.';
  }
  if (status === 409) {
    return safeServerMessage(raw) || 'That information is already in use. Check it and try again.';
  }
  if (status === 413 || error?.code === 'LIMIT_FILE_SIZE') {
    return 'That photo is too large. Choose a photo smaller than 5 MB.';
  }
  if (status === 415 || error?.code === 'UNSUPPORTED_IMAGE_TYPE') return 'Choose a JPG, PNG, or WebP photo.';
  if (status === 429) return 'You’ve tried that a few times. Wait a moment, then try again.';

  if (status === 400 || status === 422) {
    if (/choose an image|choose a photo|image to upload/.test(message)) return 'Choose a photo before continuing.';
    if (/jpeg|png|webp|valid image|image file/.test(message)) return 'Choose a JPG, PNG, or WebP photo.';
    return safeServerMessage(raw) || 'Some of those details need another look. Check them and try again.';
  }

  if (action === 'photo' && /not a valid|invalid image|image signature/.test(message)) {
    return 'That photo couldn’t be read. Choose another photo and try again.';
  }
  if (action === 'photo' && /storage is not configured|public domain is not configured/.test(message)) {
    return 'Photo uploads aren’t available right now. You can choose one of the preset avatars instead.';
  }

  if (error?.kind === 'timeout' || error?.name === 'AbortError' || /timed out|timeout/.test(message)) {
    if (action === 'photo') return 'Your photo is taking longer than expected. Try a smaller photo or try again.';
    if (action === 'profile') return 'Saving your profile is taking longer than expected. Please try again.';
    return 'That’s taking longer than expected. Please try again.';
  }

  if (status >= 500 || error?.kind === 'service') {
    if (action === 'photo') return 'We couldn’t upload your photo right now. Please try again in a moment.';
    if (action === 'profile') return 'We couldn’t save your profile right now. Your details are still here; please try again.';
    return 'Something went wrong while completing that. Please try again in a moment.';
  }

  if (error?.kind === 'network' || /network|fetch failed|cannot reach|connection|econn|eacces/.test(message)) {
    if (action === 'photo') return 'Your photo didn’t upload. Check your connection and try again.';
    if (action === 'profile') return 'Your profile couldn’t be saved. Check your connection and try again.';
    return 'We couldn’t complete that just now. Check your connection and try again.';
  }

  return safeServerMessage(raw) || 'We couldn’t complete that just now. Please try again.';
}
