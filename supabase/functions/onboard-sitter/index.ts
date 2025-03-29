// @deno-types="https://deno.land/std@0.168.0/http/server.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @deno-types="https://esm.sh/@supabase/supabase-js@2.7.1"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
// @deno-types="https://esm.sh/stripe@12.0.0"
import Stripe from "https://esm.sh/stripe@12.0.0";

interface StripeError extends Error {
  type?: string;
  code?: string;
  param?: string;
  raw?: any;
}

interface Profile {
  id: string;
  role: string;
  name: string;
  email: string;
  stripe_account_id?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  console.log('Request received:', {
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    url: req.url
  });

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request body:', requestBody);
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Stripe API key from environment variable
    const stripeApiKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeApiKey) {
      console.error('Missing STRIPE_SECRET_KEY environment variable');
      return new Response(
        JSON.stringify({ error: "Server configuration error: Missing Stripe key" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeApiKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Create Supabase client using auth headers from request
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ error: "Server configuration error: Missing Supabase configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('Environment variables loaded successfully');

    // Get JWT from authorization header
    const authHeader = req.headers.get("Authorization")?.split(" ")[1];
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ 
          error: "No authorization header provided",
          headers: Object.fromEntries(req.headers.entries())
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase admin client to access user info
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Supabase admin client created');
    
    // Verify JWT token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader);
    console.log('Auth response:', { hasUser: !!user, hasError: !!authError });
    
    if (authError) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ 
          error: "Invalid authorization token",
          details: authError
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!user) {
      console.error('No user found in auth response');
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the user's profile to confirm they are a sitter
    console.log('Fetching profile for user:', user.id);
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, role, name, email, stripe_account_id")
      .eq("id", user.id)
      .single();
    
    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to fetch user profile",
          details: profileError
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!profile) {
      console.error('No profile found for user:', user.id);
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('Profile found:', {
      id: profile.id,
      role: profile.role,
      hasEmail: !!profile.email,
      hasStripeAccount: !!profile.stripe_account_id
    });

    // Verify the user is a sitter
    if (profile.role !== "sitter") {
      console.error('User is not a sitter:', profile.role);
      return new Response(
        JSON.stringify({ error: "Only sitters can onboard for payments" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the sitter already has a Stripe account ID
    let stripeAccountId = profile.stripe_account_id;
    
    // If no Stripe account exists, create one
    if (!stripeAccountId) {
      console.log(`Creating new Stripe account for sitter ${profile.id}`);
      
      try {
        // First verify that Connect is enabled
        try {
          await stripe.accounts.list({ limit: 1 });
        } catch (connectError: any) {
          if (connectError.message?.includes('signed up for Connect')) {
            console.error('Stripe Connect is not enabled:', connectError);
            return new Response(
              JSON.stringify({
                error: 'Stripe Connect setup required',
                message: 'Please enable Stripe Connect in your dashboard and ensure you are using a Connect-enabled API key.',
                details: 'Visit https://dashboard.stripe.com/connect/overview to get started with Connect',
                raw: connectError
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          throw connectError;
        }

        // Create the Connect account
        const account = await stripe.accounts.create({
          type: 'express',
          email: profile.email,
          metadata: {
            user_id: profile.id,
          },
          capabilities: {
            card_payments: {
              requested: true,
            },
            transfers: {
              requested: true,
            },
          },
        });
        
        stripeAccountId = account.id;
        console.log('Stripe account created:', stripeAccountId);
        
        // Update the user's profile with the Stripe account ID
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ 
            stripe_account_id: stripeAccountId,
            updated_at: new Date().toISOString() // Add timestamp to avoid session invalidation
          })
          .eq('id', profile.id)
          .select();  // Return the updated record to ensure atomic update
          
        if (updateError) {
          console.error('Failed to update profile with Stripe account:', updateError);
          throw new Error('Failed to update profile with Stripe account ID');
        }
        
        console.log(`Updated profile ${profile.id} with Stripe account ${stripeAccountId}`);
      } catch (stripeError: any) {
        console.error('Error creating Stripe account:', stripeError);
        
        // Return a user-friendly error message
        return new Response(
          JSON.stringify({
            error: 'Failed to create Stripe account',
            message: stripeError.message || 'An unexpected error occurred',
            details: stripeError.raw || stripeError,
            requestId: stripeError.requestId
          }),
          { status: stripeError.statusCode || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.log(`Using existing Stripe account: ${stripeAccountId}`);
    }

    // Generate an account link for the onboarding process
    const origin = req.headers.get("origin") || "https://dogsitteradmin.app";
    const returnUrl = `${origin}/stripe-return?session_id=${user.id}`;
    const refreshUrl = `${origin}/stripe-refresh?session_id=${user.id}`;
    
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    // Return the account link URL
    return new Response(
      JSON.stringify({ url: accountLink.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error('Error in onboard-sitter:', error);
    
    // Handle Stripe errors
    if (error.type) {
      const stripeError = error as StripeError;
      return new Response(
        JSON.stringify({
          error: stripeError.message,
          type: stripeError.type,
          code: stripeError.code,
          param: stripeError.param
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Handle other errors
    return new Response(
      JSON.stringify({
        error: error.message || 'An unexpected error occurred',
        type: error.constructor.name,
        stack: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
    
  }
});
