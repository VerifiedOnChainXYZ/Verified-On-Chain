import { createClient } from '@supabase/supabase-js';

// Project URL derived from your connection string
const PROJECT_URL = 'https://hqnpgvlrgqqruimupzbu.supabase.co';

// 🚨 PASTE YOUR "anon public" KEY HERE FROM SUPABASE DASHBOARD
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxbnBndmxyZ3FxcnVpbXVwemJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3MzU0OTQsImV4cCI6MjA4MTMxMTQ5NH0.4gd_6LpDzmUYulygiv6IoPeAiXYyzGSKjQFYiw-8D0c'; 

export const supabase = createClient(PROJECT_URL, SUPABASE_KEY);