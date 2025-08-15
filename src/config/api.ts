const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

console.log('🔍 Environment check in api.ts:');
console.log('🔍 import.meta.env.VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
console.log('🔍 Final API_BASE_URL:', API_BASE_URL);

export default API_BASE_URL;