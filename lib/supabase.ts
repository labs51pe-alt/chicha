
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zjuemuaqrnijrnjvxpfk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqdWVtdWFxcm5panJuanZ4cGZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxODQ0OTYsImV4cCI6MjA4NDc2MDQ5Nn0.COdcvvzBABH0PHFooIy_UyVWVD56loJA6qMVt6_eOdQ';

export const supabase = createClient(supabaseUrl, supabaseKey);
