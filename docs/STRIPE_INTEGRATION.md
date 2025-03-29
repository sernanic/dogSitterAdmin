# Stripe Payment Integration for Sitters

This document outlines the implementation of Stripe Connect Standard for sitter payments in the Dog Sitter Admin app.

## Overview

The payment integration allows sitters to receive payments directly from dog owners, with a 10% platform fee applied on the owner's side. The system uses:

- **Stripe Connect Standard**: For sitter onboarding and payment processing
- **Supabase Edge Functions**: For secure serverless API logic
- **WebView**: For displaying the Stripe onboarding process

## Setup Requirements

### Environment Variables

The following environment variables must be set in your Supabase project:

```
STRIPE_SECRET_KEY=sk_test_...  # Stripe API secret key
SUPABASE_URL=https://your-project.supabase.co  # Your Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Supabase service role key
```

### Supabase Database

The system requires the `profiles` table to have a `stripe_account_id` column:

```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT DEFAULT NULL;
```

### Dependencies

Make sure to install the following packages:

```
react-native-webview
```

## Implementation Details

### 1. Database Schema

The payment system extends the existing `profiles` table with:

- `stripe_account_id` (text, nullable): Stores the Stripe Connect account ID for sitters

### 2. Edge Functions

Two Edge Functions handle the Stripe integration:

#### a. `onboard-sitter`

- Creates a Stripe Connect Standard account for sitters
- Generates and returns an onboarding URL
- Updates the `profiles` table with the Stripe account ID

#### b. `check-stripe-status`

- Retrieves the status of a sitter's Stripe account
- Determines if the account is active, pending, or requires more information
- Generates new onboarding links if needed

### 3. Frontend Components

#### PaymentSetupModal

A modal component that:
- Displays the Stripe onboarding flow in a WebView
- Shows different UI states based on the account status
- Handles errors gracefully

### 4. User Flow

1. Sitter clicks on "Payment Setup" in their profile
2. The app checks if they already have a Stripe account
3. If not, it creates one via the Edge Function
4. The Stripe onboarding process is displayed in a WebView
5. After completion, the sitter is redirected back to the app
6. The app verifies the setup and shows a success message

## Testing

To test the payment integration:

1. Run Supabase Edge Functions locally:
   ```
   supabase functions serve --no-verify-jwt
   ```

2. Use a test Stripe account to avoid real charges

3. Sign up as a sitter in the app and test the full onboarding flow

4. Verify the `stripe_account_id` is stored in the `profiles` table

5. Test scenarios:
   - New sitter onboarding
   - Partially completed onboarding
   - Completed onboarding
   - Error handling

## Troubleshooting

Common issues and solutions:

- **Infinite loading screen**: Check JWT token and authentication
- **Onboarding not completing**: Verify redirect URLs
- **Account not showing as active**: Ensure all required Stripe fields are completed
- **Edge Function errors**: Check logs for detailed error messages

## Production Considerations

Before deploying to production:

1. Switch to a live Stripe API key
2. Implement additional security measures
3. Set up webhook handling for account updates
4. Add monitoring for payment-related errors
