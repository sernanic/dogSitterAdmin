// This is a placeholder for the updated send-notifications edge function
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
// @deno-types="https://deno.land/std@0.177.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Expo Push API endpoint
const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

// Project IDs for different apps
const USER_APP_PROJECT_ID = 'ed6daab7-82d1-4660-aa08-8ab0f87dd6fa';
const SITTER_APP_PROJECT_ID = 'bed81605-7359-4e68-8786-b04d457fc427';

// Expo Access Token - store securely in environment variables
const USER_APP_ACCESS_TOKEN = '3W6eASluTr8wj4YQSHjq4Gj69vJ5V3gHZWjlAiaF';
const SITTER_APP_ACCESS_TOKEN = '3W6eASluTr8wj4YQSHjq4Gj69vJ5V3gHZWjlAiaF';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const { type, table, record, old_record } = await req.json();
    // Handle different notification types
    switch(table) {
      case 'messages':
        await handleMessageNotification(record);
        break;
      case 'walking_bookings':
      case 'boarding_bookings':
        await handleBookingNotification(table, record, old_record);
        break;
      case 'reviews':
        await handleReviewNotification(record);
        break;
      default:
        console.error(`Unsupported table: ${table}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('Error processing notification:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});

async function handleMessageNotification(message) {
  // Fetch thread using supabaseClient
  const { data: threadData, error: threadError } = await supabaseClient
    .from('message_threads')
    .select('owner_id, sitter_id')
    .eq('id', message.thread_id)
    .single();

  if (threadError || !threadData) {
    console.error('Error fetching thread or thread not found:', message.thread_id, threadError);
    return;
  }

  // Fetch sender profile using supabaseClient
  const { data: senderData, error: senderError } = await supabaseClient
    .from('profiles')
    .select('name') // Assuming 'name' column exists
    .eq('id', message.sender_id)
    .single();

  if (senderError || !senderData) {
    console.error('Error fetching sender or sender not found:', message.sender_id, senderError);
    return;
  }

  // Determine recipient based on thread participants
  const recipientId = threadData.owner_id === message.sender_id ? threadData.sitter_id : threadData.owner_id;
  const recipientRole = threadData.owner_id === recipientId ? 'user' : 'sitter'; // Determine recipient role
  const senderName = senderData.name || 'Someone'; // Use fetched name

  // Create notification record in database using supabaseClient
  const { error: insertError } = await supabaseClient.from('notifications').insert({
    recipient_id: recipientId,
    type: 'message',
    title: `New message from ${senderName}`, // Use sender's name
    body: message.content,
    data: {
      threadId: message.thread_id,
      messageId: message.id
    }
  });

  if (insertError) {
      console.error('Error inserting message notification:', insertError);
      // Optionally continue to try sending push notification
  }

  // Send actual push notification
  await sendNotification(
    supabaseClient, // Pass client
    recipientId,
    `New message from ${senderName}`, // Use sender's name
    message.content,
    {
      threadId: message.thread_id,
      messageId: message.id
    },
    recipientRole // Pass recipient role
  );
}

async function handleBookingNotification(table, booking, oldBooking) {
  const isNewBooking = !oldBooking;
  const hasStatusChanged = !isNewBooking && oldBooking.status !== booking.status;
  if (!isNewBooking && !hasStatusChanged) return;

  // Fetch profiles using supabaseClient
  const [{ data: ownerData, error: ownerError }, { data: sitterData, error: sitterError }] = await Promise.all([
    supabaseClient.from('profiles').select('name').eq('id', booking.owner_id).single(),
    supabaseClient.from('profiles').select('name').eq('id', booking.sitter_id).single()
  ]);

  if (ownerError || !ownerData || sitterError || !sitterData) {
    console.error('Error fetching owner/sitter profiles:', ownerError, sitterError);
    return;
  }

  const ownerName = ownerData.name || 'A user';
  const sitterName = sitterData.name || 'A sitter';
  const serviceType = table === 'walking_bookings' ? 'walk' : 'boarding';

  if (isNewBooking) {
    // Notify sitter about new booking
    const title = 'New Booking Request';
    const body = `${ownerName} has requested a ${serviceType} service`;
    const data = { bookingId: booking.id, type: table };

    // Insert notification using supabaseClient
    const { error: insertError } = await supabaseClient.from('notifications').insert({
      recipient_id: booking.sitter_id,
      type: 'booking_request',
      title: title,
      body: body,
      data: data
    });
    if (insertError) {
        console.error('Error inserting new booking notification:', insertError);
    }

    // Send push notification to sitter
    await sendNotification(
      supabaseClient, // Pass client
      booking.sitter_id,
      title,
      body,
      data,
      'sitter' // Recipient is the sitter
    );
  } else if (hasStatusChanged) {
    // Notify owner about booking status change
    const title = 'Booking Status Updated';
    const body = `Your booking with ${sitterName} is now ${booking.status}`;
    const data = { bookingId: booking.id, type: table, status: booking.status };

    // Insert notification using supabaseClient
    const { error: insertError } = await supabaseClient.from('notifications').insert({
      recipient_id: booking.owner_id,
      type: 'booking_status',
      title: title,
      body: body,
      data: data
    });
    if (insertError) {
        console.error('Error inserting booking status notification:', insertError);
    }

    // Send push notification to owner
    await sendNotification(
      supabaseClient, // Pass client
      booking.owner_id,
      title,
      body,
      data,
      'user' // Recipient is the owner (user)
    );
  }
}

async function handleReviewNotification(review) {
  // Fetch reviewer profile using supabaseClient
  const { data: reviewerData, error: reviewerError } = await supabaseClient
    .from('profiles')
    .select('name') // Assuming 'name' column exists
    .eq('id', review.reviewer_id)
    .single();

  if (reviewerError || !reviewerData) {
    console.error('Error fetching reviewer or reviewer not found:', review.reviewer_id, reviewerError);
    return;
  }

  const reviewerName = reviewerData.name || 'Someone';
  const title = 'New Review';
  const body = `${reviewerName} has left you a review`;
  const data = { reviewId: review.id };

  // Insert notification using supabaseClient
  const { error: insertError } = await supabaseClient.from('notifications').insert({
    recipient_id: review.reviewee_id,
    type: 'review',
    title: title,
    body: body,
    data: data
  });
  if (insertError) {
      console.error('Error inserting review notification:', insertError);
  }

  // Determine reviewee role (needs profile query)
  const { data: revieweeData, error: revieweeError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', review.reviewee_id)
      .single();

  if (revieweeError || !revieweeData) {
      console.error('Error fetching reviewee profile for role:', review.reviewee_id, revieweeError);
      return; // Cannot determine role, cannot send push
  }
  const revieweeRole = revieweeData.role === 'sitter' ? 'sitter' : 'user'; // Assume non-sitter is user

  // Send push notification to reviewee
  await sendNotification(
    supabaseClient, // Pass client
    review.reviewee_id,
    title,
    body,
    data,
    revieweeRole // Pass determined role
  );
}

// --- Helper Function to Send Push Notification ---
async function sendNotification(
  supabase: SupabaseClient, // Pass Supabase client instance
  recipientId: string,
  title: string,
  body: string,
  data: Record<string, any> = {}, // Optional data payload
  recipientRole: 'user' | 'sitter' // Determine which app to target
) {
  console.log(`Attempting to send notification to ${recipientRole} ${recipientId}`);

  try {
    // 1. Fetch recipient's push token and notification preference using passed client
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('expo_push_token, notifications_enabled')
      .eq('id', recipientId)
      .single();

    if (profileError) {
      console.error(`Error fetching profile for ${recipientId}:`, profileError);
      return; // Exit if profile fetch fails
    }

    if (!profileData) {
      console.log(`No profile found for recipient ${recipientId}.`);
      return;
    }

    if (!profileData.notifications_enabled) {
      console.log(`Notifications disabled for recipient ${recipientId}. Skipping.`);
      return;
    }

    const pushToken = profileData.expo_push_token;
    if (!pushToken) {
      console.log(`No push token found for recipient ${recipientId}. Skipping.`);
      return;
    }

    // 2. Determine target app details based on role
    let accessToken: string;
    let experienceId: string; // Not strictly needed for API v2, but good for context

    if (recipientRole === 'user') {
      accessToken = USER_APP_ACCESS_TOKEN;
      experienceId = `@${USER_APP_PROJECT_ID}`; // Correct format if needed
    } else if (recipientRole === 'sitter') {
      accessToken = SITTER_APP_ACCESS_TOKEN;
      experienceId = `@${SITTER_APP_PROJECT_ID}`; // Correct format if needed
    } else {
      console.error(`Invalid recipientRole: ${recipientRole}`);
      return;
    }

    if (!accessToken) {
      console.error(`Missing Expo Access Token for ${recipientRole} app.`);
      return;
    }

    console.log(`Sending notification to token: ${pushToken} for ${recipientRole} app.`);

    // 3. Construct payload
    const payload = {
      to: pushToken,
      title: title,
      body: body,
      data: data,
      sound: 'default',
      priority: 'high'
    };
    
    // Send notification via Expo Push API
    const response = await fetch(EXPO_PUSH_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    if (!response.ok) {
      // Log specific Expo errors if available
      console.error('Failed to send push notification:', response.status, response.statusText, JSON.stringify(result));
    } else {
      console.log('Push notification sent successfully to:', recipientId);
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}
