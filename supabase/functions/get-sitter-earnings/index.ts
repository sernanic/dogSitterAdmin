import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log('get-sitter-earnings function initializing');

// Helper function to get the start of the day (00:00:00)
const getStartOfDay = (date: Date): Date => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

// Helper function to get the start of the week (Monday)
const getStartOfWeek = (date: Date): Date => {
  const start = new Date(date);
  const dayOfWeek = start.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
};

// Helper function to get the start of the month
const getStartOfMonth = (date: Date): Date => {
  const start = new Date(date);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
};

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with auth context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get user session
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.log('User auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const sitterId = user.id;
    console.log(`Fetching earnings for sitter: ${sitterId}`);

    // --- Calculate Date Ranges --- Get current date in UTC
    const now = new Date();
    const todayStart = getStartOfDay(now).toISOString();
    const weekStart = getStartOfWeek(now).toISOString();
    const monthStart = getStartOfMonth(now).toISOString();
    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(now.getDate() + 1);
    const endOfToday = getStartOfDay(tomorrowStart).toISOString(); // Use start of tomorrow as end of today

    console.log(`Date Ranges: Today [${todayStart}, ${endOfToday}), Week [${weekStart}, Now), Month [${monthStart}, Now)`);

    // --- Fetch Earnings Data --- Status assumed to be 'succeeded' for paid invoices
    // Update status filter to 'paid'
    const statusFilter = 'paid';

    const fetchSum = async (startDate: string, endDate?: string) => {
        let query = supabaseClient
            .from('invoices')
            .select('sitter_payout', { count: 'exact', head: false })
            .eq('sitter_id', sitterId)
            .eq('status', statusFilter)
            .gte('created_at', startDate);

        if (endDate) {
            query = query.lt('created_at', endDate);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error(`Error fetching sum from ${startDate} to ${endDate}:`, error);
            throw error;
        }

        console.log(`Fetched ${count} invoices from ${startDate} to ${endDate}`);
        const total = data?.reduce((sum: number, record: { sitter_payout: number | null }) => sum + (record.sitter_payout || 0), 0) ?? 0;
        console.log(`Total payout from ${startDate} to ${endDate}: ${total}`);
        return total;
    };

    // Execute queries concurrently
    const [todayEarnings, weekEarnings, monthEarnings] = await Promise.all([
        fetchSum(todayStart, endOfToday), // Today: Use precise start/end
        fetchSum(weekStart),          // Week to Date: Use start of week until now
        fetchSum(monthStart)          // Month to Date: Use start of month until now
    ]);

    const earningsData = {
      today: todayEarnings,
      thisWeek: weekEarnings,
      thisMonth: monthEarnings,
    };

    console.log('Successfully fetched earnings:', earningsData);

    return new Response(JSON.stringify(earningsData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.log('Internal Server Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
