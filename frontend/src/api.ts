/// <reference types="vite/client" />
import axios from 'axios';

// Dynamic API Base URL from environment variable (Vercel production -> Render backend URL)
const rawBaseURL = (import.meta as any).env?.VITE_API_BASE_URL || '';
export const API_BASE_URL = typeof rawBaseURL === 'string' ? rawBaseURL.replace(/\/$/, '') : '';

export const api = axios.create({
  baseURL: API_BASE_URL
});
