import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dgxtdoobnctcexmklbpj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRneHRkb29ibmN0Y2V4bWtsYnBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MDA2MzAsImV4cCI6MjA3OTQ3NjYzMH0.NLZ2Fi1IjegShS4OYtFFH-WFwR6zjVSWEz4WEXoB1sU';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
