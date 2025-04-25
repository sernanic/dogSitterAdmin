// check-stripe-status/index.ts
// Supabase Edge Function to check a sitter's Stripe Connect account status

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import Stripe from "https://esm.sh/stripe@12.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get Stripe API key from environment variable
    const stripeApiKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeApiKey) {
      throw new Error("Missing STRIPE_SECRET_KEY environment variable");
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
      throw new Error("Missing Supabase environment variables");
    }

    // Parse request body for account_id
    let account_id;
    
    // If there's a body, parse it
    if (req.headers.get("content-type")?.includes("application/json")) {
      const body = await req.json();
      account_id = body.account_id;
    }
    
    // Get JWT from authorization header
    const authHeader = req.headers.get("Authorization")?.split(" ")[1];
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header provided" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase admin client to access user info
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify JWT token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If account_id wasn't provided in the body, get it from the user's profile
    if (!account_id) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("stripe_account_id")
        .eq("id", user.id)
        .single();
      
      if (profileError || !profile || !profile.stripe_account_id) {
        return new Response(
          JSON.stringify({ error: "User has no Stripe account", status: "none" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      account_id = profile.stripe_account_id;
    }

    // Retrieve account details from Stripe
    const account = await stripe.accounts.retrieve(account_id);
    
    // Check if the account is fully set up
    // Determine account status based on capabilities and details_submitted
    let status = "none";
    let onboardingUrl = null;
    
    if (account.details_submitted) {
      if (account.capabilities?.card_payments === "active" && account.capabilities?.transfers === "active") {
        status = "active";
      } else {
        status = "restricted";
      }
    } else {
      // Account not fully set up, needs more information
      status = "pending";
      
      // Generate a new account link for completing onboarding
      const origin = req.headers.get("origin") || "https://dogsitteradmin.app";
      const returnUrl = `${origin}/stripe-return?session_id=${user.id}`;
      const refreshUrl = `${origin}/stripe-refresh?session_id=${user.id}`;
      
      const accountLink = await stripe.accountLinks.create({
        account: account_id,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: "account_onboarding",
      });
      
      onboardingUrl = accountLink.url;
    }

    // Return account status and onboarding URL if needed
    return new Response(
      JSON.stringify({ 
        status, 
        onboarding_url: onboardingUrl,
        account_id: account.id,
        details_submitted: account.details_submitted
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.log("Error in check-stripe-status function:", error);
    
    // If the error is about the account not existing, handle gracefully
    if (error.type === 'StripeInvalidRequestError' && error.code === 'resource_missing') {
      return new Response(
        JSON.stringify({ error: "Stripe account not found", status: "none" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred", status: "error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
