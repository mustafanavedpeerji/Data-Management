const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://magicfingers.com.pk/backend';

console.log('🔍 Environment check in api.ts:');
console.log('🔍 import.meta.env.VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
console.log('🔍 Final API_BASE_URL:', API_BASE_URL);

export default API_BASE_URL;