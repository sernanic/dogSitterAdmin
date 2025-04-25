// This is a placeholder for the updated send-notifications edge function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
// @deno-types="https://deno.land/std@0.177.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { DatabaseService } from './database.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const db = new DatabaseService(supabaseClient);

// Expo Push API endpoint
const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

// Project IDs for different apps
const USER_APP_PROJECT_ID = 'ed6daab7-82d1-4660-aa08-8ab0f87dd6fa';
const SITTER_APP_PROJECT_ID = 'bed81605-7359-4e68-8786-b04d457fc427';

// Expo Access Token - store securely in environment variables
const USER_APP_ACCESS_TOKEN = Deno.env.get('USER_APP_EXPO_ACCESS_TOKEN') ?? '';
const SITTER_APP_ACCESS_TOKEN = Deno.env.get('SITTER_APP_EXPO_ACCESS_TOKEN') ?? '';

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
  const thread = await db.getMessageThread(message.thread_id);
  if (!thread) {
    console.log('Thread not found:', message.thread_id);
    return;
  }
  const sender = await db.getProfile(message.sender_id);
  if (!sender) {
    console.log('Sender not found:', message.sender_id);
    return;
  }
  // Determine recipient based on thread participants
  const recipientId = thread.owner_id === message.sender_id ? thread.sitter_id : thread.owner_id;
  
  // Create notification record in database
  await db.createNotification({
    recipient_id: recipientId,
    type: 'message',
    title: sender.full_name,
    body: message.content,
    data: {
      threadId: message.thread_id,
      messageId: message.id
    }
  });
  
  // Send actual push notification
  await sendPushNotification(recipientId, sender.full_name, message.content, {
    threadId: message.thread_id,
    messageId: message.id
  });
}

async function handleBookingNotification(table, booking, oldBooking) {
  const isNewBooking = !oldBooking;
  const hasStatusChanged = oldBooking && booking.status !== oldBooking.status;
  if (!isNewBooking && !hasStatusChanged) return;
  
  const [owner, sitter] = await Promise.all([
    db.getProfile(booking.owner_id),
    db.getProfile(booking.sitter_id)
  ]);
  
  if (!owner || !sitter) {
    console.log('Owner or sitter not found');
    return;
  }
  
  if (isNewBooking) {
    // Notify sitter about new booking
    await db.createNotification({
      recipient_id: booking.sitter_id,
      type: 'booking_request',
      title: 'New Booking Request',
      body: `${owner.full_name} has requested a ${table === 'walking_bookings' ? 'walk' : 'boarding'} service`,
      data: {
        bookingId: booking.id,
        type: table
      }
    });
    
    // Send push notification to sitter
    await sendPushNotification(
      booking.sitter_id, 
      'New Booking Request', 
      `${owner.full_name} has requested a ${table === 'walking_bookings' ? 'walk' : 'boarding'} service`,
      {
        bookingId: booking.id,
        type: table
      }
    );
  } else if (hasStatusChanged) {
    // Notify owner about booking status change
    await db.createNotification({
      recipient_id: booking.owner_id,
      type: 'booking_status',
      title: 'Booking Status Updated',
      body: `Your booking with ${sitter.full_name} is now ${booking.status}`,
      data: {
        bookingId: booking.id,
        type: table,
        status: booking.status
      }
    });
    
    // Send push notification to owner
    await sendPushNotification(
      booking.owner_id, 
      'Booking Status Updated', 
      `Your booking with ${sitter.full_name} is now ${booking.status}`,
      {
        bookingId: booking.id,
        type: table,
        status: booking.status
      }
    );
  }
}

async function handleReviewNotification(review) {
  const reviewer = await db.getProfile(review.reviewer_id);
  if (!reviewer) {
    console.log('Reviewer not found:', review.reviewer_id);
    return;
  }
  
  await db.createNotification({
    recipient_id: review.reviewee_id,
    type: 'review',
    title: 'New Review',
    body: `${reviewer.full_name} has left you a review`,
    data: {
      reviewId: review.id
    }
  });
  
  // Send push notification to reviewee
  await sendPushNotification(
    review.reviewee_id, 
    'New Review', 
    `${reviewer.full_name} has left you a review`,
    {
      reviewId: review.id
    }
  );
}

async function sendPushNotification(recipientId: string, title: string, body: string, data: any) {
  try {
    // Get recipient's profile to retrieve push token and app type
    const recipient = await db.getProfile(recipientId);
    if (!recipient || !recipient.expo_push_token) {
      console.log('Recipient or push token not found:', recipientId);
      return;
    }
    
    // Determine which app/project to use based on role or app_type
    const isUserApp = recipient.role !== 'sitter'; // Assuming non-sitter roles are user app
    const projectId = isUserApp ? USER_APP_PROJECT_ID : SITTER_APP_PROJECT_ID;
    const accessToken = isUserApp ? USER_APP_ACCESS_TOKEN : SITTER_APP_ACCESS_TOKEN;
    
    if (!accessToken) {
      console.log('No access token configured for app type:', isUserApp ? 'user' : 'sitter');
      return;
    }
    
    // Prepare the notification payload for Expo
    const payload = {
      to: recipient.expo_push_token,
      title,
      body,
      data,
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
      console.log('Failed to send push notification:', result);
    } else {
      console.log('Push notification sent successfully to:', recipientId);
    }
  } catch (error) {
    console.log('Error sending push notification:', error);
  }
}
