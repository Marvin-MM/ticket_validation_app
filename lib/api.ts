import axios from 'axios';
import { Platform } from 'react-native';

const BASE_URL = 'https://ticketing-marketplace.onrender.com';

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

if (Platform.OS === 'web') {
  api.defaults.withCredentials = true;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('[API Error]', error.response?.status, error.response?.data);
    
    if (error.response?.status === 401) {
      console.log('[API] Unauthorized - clearing session');
    }
    
    return Promise.reject(error);
  }
);
