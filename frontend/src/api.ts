/// <reference types="vite/client" />
import axios from 'axios';

// Live production Render backend URL fallback
const DEFAULT_PRODUCTION_URL = 'https://insta-automate-1.onrender.com';

const rawBaseURL =
  (import.meta as any).env?.VITE_API_URL ||
  (import.meta as any).env?.VITE_API_BASE_URL ||
  DEFAULT_PRODUCTION_URL;

export const API_BASE_URL =
  typeof rawBaseURL === 'string' && rawBaseURL.trim() !== ''
    ? rawBaseURL.trim().replace(/\/$/, '')
    : DEFAULT_PRODUCTION_URL;

export const api = axios.create({
  baseURL: API_BASE_URL
});

