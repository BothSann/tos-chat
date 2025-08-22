/**
 * Utility functions for the application
 */

/**
 * Formats avatar URL to be absolute if it's relative
 * @param {string|null|undefined} avatarUrl - The avatar URL from the backend
 * @returns {string|null} - Formatted absolute URL or null
 */
export function formatAvatarUrl(avatarUrl) {
  if (!avatarUrl) return null;
  
  // If it's already an absolute URL, return as is
  if (avatarUrl.startsWith('http')) {
    return avatarUrl;
  }
  
  // If it's a relative URL, make it absolute
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  return `${baseURL}${avatarUrl}`;
}

/**
 * Formats an array of items (users, contacts, etc.) with proper avatar URLs
 * @param {Array} items - Array of items with potential avatarUrl property
 * @returns {Array} - Array with formatted avatar URLs
 */
export function formatAvatarUrls(items) {
  if (!Array.isArray(items)) return items;
  
  return items.map(item => ({
    ...item,
    avatarUrl: formatAvatarUrl(item.avatarUrl)
  }));
}

/**
 * Formats a single user object with proper avatar URL and admin status
 * @param {Object} user - User object with potential avatarUrl property
 * @returns {Object} - User object with formatted avatar URL and admin status
 */
export function formatUserAvatarUrl(user) {
  if (!user) return user;
  
  return {
    ...user,
    avatarUrl: formatAvatarUrl(user.avatarUrl),
    isAdmin: user.role === 'ADMIN'
  };
}