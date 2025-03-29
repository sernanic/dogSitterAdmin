# DogSitter Supabase Database Schema

## Overview

This document outlines the structure, relationships, and security policies of the DogSitter PostgreSQL database managed via Supabase migrations. The database is designed to support a platform connecting dog owners with dog sitters for services like walking and boarding. It includes tables for user profiles (implied), pets, addresses, bookings, availability, messaging, reviews, and payment integration details.

**Note:** The definition for the `public.profiles` table and `sitter_weekly_availability` table are not included in the provided files but are referenced by several other tables. It's assumed that `public.profiles` exists and contains user profile information, likely linked to `auth.users` via a UUID `id` column that matches `auth.uid()`. Similarly, `sitter_weekly_availability` is assumed to store time slots sitters make available.

---

## Table of Contents

1.  [Core Entities](#core-entities)
    *   [pets](#pets)
    *   [addresses](#addresses)
2.  [Booking System](#booking-system)
    *   [walking_bookings](#walking_bookings)
    *   [boarding_availability](#boarding_availability)
    *   [boarding_bookings](#boarding_bookings)
3.  [Communication](#communication)
    *   [message_threads](#message_threads)
    *   [messages](#messages)
4.  [Reviews](#reviews)
5.  [Payment Integration](#payment-integration)
6.  [Storage](#storage)
    *   [avatars Bucket](#avatars-bucket)
7.  [Shared Functions & Triggers](#shared-functions--triggers)
8.  [Key Relationships Summary](#key-relationships-summary)

---

## Core Entities

### `pets`

*   **Purpose:** Stores information about pets belonging to users (owners).
*   **SQL File:** `20240626_create_pets_table.sql`

**Columns:**

| Column        | Type                    | Constraints                                       | Description                                     |
| :------------ | :---------------------- | :------------------------------------------------ | :---------------------------------------------- |
| `id`          | `UUID`                  | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()`       | Unique identifier for the pet.                  |
| `owner_id`    | `UUID`                  | `NOT NULL`, `REFERENCES public.profiles(id)`      | Foreign key linking to the pet owner's profile. |
| `name`        | `TEXT`                  | `NOT NULL`                                        | Name of the pet.                                |
| `breed`       | `TEXT`                  |                                                   | Breed of the pet.                               |
| `age`         | `INTEGER`               |                                                   | Age of the pet in years.                        |
| `gender`      | `TEXT`                  | `CHECK (gender IN ('male', 'female', 'unknown'))` | Gender of the pet.                              |
| `is_neutered` | `BOOLEAN`               | `DEFAULT false`                                   | Indicates if the pet is neutered/spayed.        |
| `weight`      | `DECIMAL(5,2)`          |                                                   | Weight of the pet (e.g., in kg or lbs).         |
| `image_url`   | `TEXT`                  |                                                   | URL to an image of the pet.                     |
| `created_at`  | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT now()`                       | Timestamp of pet record creation.               |
| `updated_at`  | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT now()`                       | Timestamp of last pet record update.            |

**Relationships:**

*   Many-to-One: A pet belongs to one `profiles` (owner).

**Row Level Security (RLS):**

*   Enabled: Yes
*   Policies:
    *   `SELECT`: Users can view their own pets (`auth.uid() = owner_id`).
    *   `INSERT`: Users can insert pets linked to their own profile (`auth.uid() = owner_id`).
    *   `UPDATE`: Users can update their own pets (`auth.uid() = owner_id`).
    *   `DELETE`: Users can delete their own pets (`auth.uid() = owner_id`).

**Triggers:**

*   `set_timestamp`: Before `UPDATE`, executes `public.trigger_set_timestamp()` to update the `updated_at` column.

---

### `addresses`

*   **Purpose:** Stores physical addresses associated with user profiles. Used for location-based searches or service areas.
*   **SQL File:** `addresses.sql`

**Columns:**

| Column            | Type                       | Constraints                                  | Description                                           |
| :---------------- | :------------------------- | :------------------------------------------- | :---------------------------------------------------- |
| `id`              | `UUID`                     | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()`  | Unique identifier for the address.                    |
| `profile_id`      | `UUID`                     | `NOT NULL`, `REFERENCES auth.users(id)`      | Foreign key linking to the user's authentication ID. **Note:** Links to `auth.users` directly, not `public.profiles`. |
| `formatted_address`| `TEXT`                    | `NOT NULL`                                   | Full, formatted address string.                       |
| `street_address`  | `TEXT`                     |                                              | Street name and number.                               |
| `city`            | `TEXT`                     |                                              | City name.                                            |
| `state`           | `TEXT`                     |                                              | State or province.                                    |
| `postal_code`     | `TEXT`                     |                                              | Postal or ZIP code.                                   |
| `country`         | `TEXT`                     |                                              | Country name.                                         |
| `latitude`        | `DOUBLE PRECISION`         |                                              | Geographic latitude.                                  |
| `longitude`       | `DOUBLE PRECISION`         |                                              | Geographic longitude.                                 |
| `is_primary`      | `BOOLEAN`                  | `DEFAULT false`                              | Flag indicating if this is the user's primary address. |
| `created_at`      | `TIMESTAMPTZ` (`TIMESTAMP WITH TIME ZONE`) | `NOT NULL`, `DEFAULT NOW()`        | Timestamp of address record creation.                 |
| `updated_at`      | `TIMESTAMPTZ` (`TIMESTAMP WITH TIME ZONE`) | `NOT NULL`, `DEFAULT NOW()`        | Timestamp of last address record update.              |

**Relationships:**

*   Many-to-One: An address belongs to one `auth.users`. A user can have multiple addresses.

**Row Level Security (RLS):**

*   Enabled: Yes
*   Policies:
    *   `SELECT`: Users can view their own addresses (`auth.uid() = profile_id`).
    *   `INSERT`: Users can insert addresses linked to their own profile (`auth.uid() = profile_id`).
    *   `UPDATE`: Users can update their own addresses (`auth.uid() = profile_id`).
    *   `DELETE`: Users can delete their own addresses (`auth.uid() = profile_id`).

**Indexes:**

*   `addresses_profile_id_idx`: On `profile_id` for faster lookups by user.
*   `addresses_is_primary_idx`: On `is_primary` for quickly finding the primary address.

**Triggers:**

*   `set_addresses_updated_at`: Before `UPDATE`, executes `public.handle_updated_at()` to update the `updated_at` column.

---

## Booking System

### `walking_bookings`

*   **Purpose:** Manages bookings for dog walking services.
*   **SQL Files:** `20250312_create_walking_bookings.sql`, `20250324_add_payment_intent_id.sql`

**Columns:**

| Column               | Type                       | Constraints                                           | Description                                                              |
| :------------------- | :------------------------- | :---------------------------------------------------- | :----------------------------------------------------------------------- |
| `id`                 | `UUID`                     | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`            | Unique identifier for the walking booking.                               |
| `owner_id`           | `UUID`                     | `NOT NULL`, `REFERENCES public.profiles(id)`          | Foreign key linking to the owner's profile.                              |
| `sitter_id`          | `UUID`                     | `NOT NULL`, `REFERENCES public.profiles(id)`          | Foreign key linking to the sitter's profile.                             |
| `availability_slot_id` | `UUID`                   | `NOT NULL`, `REFERENCES sitter_weekly_availability(id)` | Foreign key linking to the specific availability slot booked.            |
| `booking_date`       | `DATE`                     | `NOT NULL`                                            | The specific date of the walk.                                           |
| `start_time`         | `TIME`                     | `NOT NULL`                                            | The start time of the walk.                                              |
| `end_time`           | `TIME`                     | `NOT NULL`                                            | The end time of the walk.                                                |
| `selected_pets`      | `JSONB`                    | `NOT NULL`                                            | Flexible JSON storage for details of the pet(s) being walked (e.g., array of pet IDs or objects). |
| `status`             | `TEXT`                     | `NOT NULL`, `DEFAULT 'pending'`                         | Current status: `pending`, `confirmed`, `completed`, `cancelled`.        |
| `total_price`        | `DECIMAL(10, 2)`           | `NOT NULL`                                            | Calculated total price for the booking.                                  |
| `notes`              | `TEXT`                     |                                                       | Optional notes from the owner for the sitter.                            |
| `created_at`         | `TIMESTAMPTZ` (`TIMESTAMP WITH TIME ZONE`) | `NOT NULL`, `DEFAULT NOW()`                   | Timestamp of booking creation.                                           |
| `updated_at`         | `TIMESTAMPTZ` (`TIMESTAMP WITH TIME ZONE`) | `NOT NULL`, `DEFAULT NOW()`                   | Timestamp of last booking update.                                        |
| `payment_intent_id`  | `TEXT`                     |                                                       | Optional: Stores the Stripe Payment Intent ID associated with the booking. |

**Relationships:**

*   Many-to-One: Belongs to one `profiles` (owner).
*   Many-to-One: Belongs to one `profiles` (sitter).
*   Many-to-One: Relates to one `sitter_weekly_availability` slot.

**Row Level Security (RLS):**

*   Enabled: Yes
*   Policies:
    *   `SELECT`: Users can view bookings where they are the owner OR the sitter (`auth.uid() = owner_id OR auth.uid() = sitter_id`).
    *   `INSERT`: Users can create bookings where they are the owner (`auth.uid() = owner_id`).
    *   `UPDATE`: Users can update bookings where they are the owner (`auth.uid() = owner_id`).
    *   `DELETE`: Users can delete bookings where they are the owner (`auth.uid() = owner_id`).

**Indexes:**

*   `walking_bookings_owner_id_idx`: On `owner_id`.
*   `walking_bookings_sitter_id_idx`: On `sitter_id`.
*   `walking_bookings_status_idx`: On `status`.
*   `walking_bookings_booking_date_idx`: On `booking_date`.

**Triggers:**

*   `update_walking_bookings_updated_at`: Before `UPDATE`, executes `update_walking_bookings_updated_at()` to update the `updated_at` column.

---

### `boarding_availability`

*   **Purpose:** Stores dates when a sitter is available for pet boarding, along with pricing and capacity.
*   **SQL File:** `20250313_create_boarding_tables.sql`

**Columns:**

| Column           | Type                       | Constraints                                           | Description                               |
| :--------------- | :------------------------- | :---------------------------------------------------- | :---------------------------------------- |
| `id`             | `UUID`                     | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()`           | Unique identifier for the availability slot. |
| `sitter_id`      | `UUID`                     | `NOT NULL`, `REFERENCES public.profiles(id)`          | Foreign key linking to the sitter's profile. |
| `available_date` | `DATE`                     | `NOT NULL`                                            | The specific date the sitter is available. |
| `price_per_night`| `DECIMAL(10, 2)`           | `NOT NULL`                                            | The sitter's price for boarding on this date. |
| `max_pets`       | `INTEGER`                  | `NOT NULL`, `DEFAULT 2`                               | Maximum number of pets the sitter can board. |
| `created_at`     | `TIMESTAMP WITH TIME ZONE` | `DEFAULT NOW()`                                       | Timestamp of availability record creation. |
| `updated_at`     | `TIMESTAMP WITH TIME ZONE` | `DEFAULT NOW()`                                       | Timestamp of last availability record update. |
|                  |                            | `UNIQUE (sitter_id, available_date)`                  | Ensures a sitter has only one entry per date. |

**Relationships:**

*   Many-to-One: Belongs to one `profiles` (sitter).

**Row Level Security (RLS):**

*   *(Not explicitly defined in the provided files for this table. Assumed to be either public read or restricted to sitters managing their own availability via separate policies not shown).*

**Triggers:**

*   `set_boarding_availability_updated_at`: Before `UPDATE`, executes `public.handle_updated_at()` to update the `updated_at` column.

---

### `boarding_bookings`

*   **Purpose:** Manages bookings for pet boarding services.
*   **SQL File:** `20250313_create_boarding_tables.sql`

**Columns:**

| Column               | Type                       | Constraints                                                   | Description                                                 |
| :------------------- | :------------------------- | :------------------------------------------------------------ | :---------------------------------------------------------- |
| `id`                 | `UUID`                     | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()`                   | Unique identifier for the boarding booking.                 |
| `owner_id`           | `UUID`                     | `NOT NULL`, `REFERENCES public.profiles(id)`                  | Foreign key linking to the owner's profile.                 |
| `sitter_id`          | `UUID`                     | `NOT NULL`, `REFERENCES public.profiles(id)`                  | Foreign key linking to the sitter's profile.                |
| `pet_id`             | `UUID`                     | `NOT NULL`, `REFERENCES public.pets(id)`                      | Foreign key linking to the specific pet being boarded.       |
| `start_date`         | `DATE`                     | `NOT NULL`                                                    | The start date of the boarding period.                      |
| `end_date`           | `DATE`                     | `NOT NULL`, `CONSTRAINT start_before_end CHECK (start_date <= end_date)` | The end date of the boarding period. Must be on or after start date. |
| `status`             | `VARCHAR(20)`              | `NOT NULL`, `DEFAULT 'pending'`, `CHECK (status IN (...))`    | Current status: `pending`, `confirmed`, `completed`, `cancelled`. |
| `total_price`        | `DECIMAL(10, 2)`           | `NOT NULL`                                                    | Calculated total price for the boarding period.             |
| `special_instructions`| `TEXT`                    |                                                               | Optional special instructions from the owner for the sitter. |
| `created_at`         | `TIMESTAMP WITH TIME ZONE` | `DEFAULT NOW()`                                               | Timestamp of booking creation.                              |
| `updated_at`         | `TIMESTAMP WITH TIME ZONE` | `DEFAULT NOW()`                                               | Timestamp of last booking update.                           |

**Relationships:**

*   Many-to-One: Belongs to one `profiles` (owner).
*   Many-to-One: Belongs to one `profiles` (sitter).
*   Many-to-One: Relates to one `pets`.

**Row Level Security (RLS):**

*   Enabled: Yes
*   Policies:
    *   `SELECT` (Owners): Owners can view their own bookings (`owner_id = auth.uid()`).
    *   `SELECT` (Sitters): Sitters can view bookings assigned to them (`sitter_id = auth.uid()`).
    *   `INSERT`: Owners can create bookings (`owner_id = auth.uid()`).
    *   `UPDATE` (Owners): Owners can update their own bookings *only if* the status is 'pending' (`owner_id = auth.uid() AND status = 'pending'`).
    *   `UPDATE` (Sitters): Sitters can update bookings assigned to them (primarily intended for status changes) (`sitter_id = auth.uid()`).

**Indexes:**

*   `idx_boarding_bookings_owner_id`: On `owner_id`.
*   `idx_boarding_bookings_sitter_id`: On `sitter_id`.
*   `idx_boarding_bookings_pet_id`: On `pet_id`.
*   `idx_boarding_bookings_status`: On `status`.
*   `idx_boarding_bookings_dates`: Composite index on `start_date`, `end_date`.

**Triggers:**

*   `set_boarding_bookings_updated_at`: Before `UPDATE`, executes `public.handle_updated_at()` to update the `updated_at` column.

---

## Communication

### `message_threads`

*   **Purpose:** Represents a conversation thread between an owner and a sitter, potentially linked to a specific walking booking.
*   **SQL File:** `20250313_create_messaging_tables.sql`

**Columns:**

| Column            | Type                       | Constraints                                  | Description                                                        |
| :---------------- | :------------------------- | :------------------------------------------- | :----------------------------------------------------------------- |
| `id`              | `UUID`                     | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`   | Unique identifier for the message thread.                          |
| `booking_id`      | `UUID`                     | `REFERENCES walking_bookings(id)`            | Optional FK linking the thread to a specific walking booking.      |
| `owner_id`        | `UUID`                     | `NOT NULL`, `REFERENCES public.profiles(id)` | Foreign key linking to the owner's profile in the thread.          |
| `sitter_id`       | `UUID`                     | `NOT NULL`, `REFERENCES public.profiles(id)` | Foreign key linking to the sitter's profile in the thread.         |
| `last_message`    | `TEXT`                     |                                              | Content of the most recent message in the thread (for previews).   |
| `last_message_time`| `TIMESTAMPTZ` (`TIMESTAMP WITH TIME ZONE`) |                                  | Timestamp of the most recent message in the thread.                |
| `created_at`      | `TIMESTAMPTZ` (`TIMESTAMP WITH TIME ZONE`) | `NOT NULL`, `DEFAULT NOW()`        | Timestamp of thread creation.                                      |
| `updated_at`      | `TIMESTAMPTZ` (`TIMESTAMP WITH TIME ZONE`) | `NOT NULL`, `DEFAULT NOW()`        | Timestamp of last thread update (e.g., when a new message arrives). |

**Relationships:**

*   Many-to-One: Involves one `profiles` (owner).
*   Many-to-One: Involves one `profiles` (sitter).
*   One-to-Many: Can have multiple `messages`.
*   Many-to-One (Optional): Can relate to one `walking_bookings`. *Note: Currently only links to walking, not boarding bookings.*

**Row Level Security (RLS):**

*   *(Not explicitly defined in the provided files for this table. Access control likely needs to be implemented, allowing involved owner/sitter to view/interact).*

**Indexes:**

*   `idx_message_threads_owner_id`: On `owner_id`.
*   `idx_message_threads_sitter_id`: On `sitter_id`.

**Triggers:**

*   *(Trigger `trigger_update_thread_last_message` on the `messages` table updates this table).*

---

### `messages`

*   **Purpose:** Stores individual messages within a `message_threads`.
*   **SQL File:** `20250313_create_messaging_tables.sql`

**Columns:**

| Column     | Type                       | Constraints                                  | Description                               |
| :--------- | :------------------------- | :------------------------------------------- | :---------------------------------------- |
| `id`       | `UUID`                     | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`   | Unique identifier for the message.        |
| `thread_id`| `UUID`                     | `NOT NULL`, `REFERENCES message_threads(id)` | Foreign key linking to the parent thread. |
| `sender_id`| `UUID`                     | `NOT NULL`, `REFERENCES public.profiles(id)` | Foreign key linking to the sender's profile. |
| `content`  | `TEXT`                     | `NOT NULL`                                   | The text content of the message.          |
| `is_read`  | `BOOLEAN`                  | `NOT NULL`, `DEFAULT FALSE`                  | Flag indicating if the recipient has read the message. |
| `created_at`| `TIMESTAMPTZ` (`TIMESTAMP WITH TIME ZONE`) | `NOT NULL`, `DEFAULT NOW()`        | Timestamp of message creation.            |
| `updated_at`| `TIMESTAMPTZ` (`TIMESTAMP WITH TIME ZONE`) | `NOT NULL`, `DEFAULT NOW()`        | Timestamp of last message update.         |

**Relationships:**

*   Many-to-One: Belongs to one `message_threads`.
*   Many-to-One: Sent by one `profiles` (sender).

**Row Level Security (RLS):**

*   *(Not explicitly defined in the provided files for this table. Access control likely needs to be implemented, allowing participants of the thread to view messages).*

**Indexes:**

*   `idx_messages_thread_id`: On `thread_id` for efficient retrieval of messages within a thread.

**Triggers:**

*   `trigger_update_thread_last_message`: After `INSERT`, executes `update_thread_last_message()` to update the `last_message` and `last_message_time` fields in the corresponding `message_threads` record.

---

## Reviews

### `reviews`

*   **Purpose:** Allows users (reviewers, typically owners) to leave ratings and comments for sitters.
*   **SQL File:** `20250325_create_reviews_table.sql`

**Columns:**

| Column      | Type                       | Constraints                                        | Description                                      |
| :---------- | :------------------------- | :------------------------------------------------- | :----------------------------------------------- |
| `id`        | `UUID`                     | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()`        | Unique identifier for the review.                |
| `sitter_id` | `UUID`                     | `NOT NULL`, `REFERENCES public.profiles(id)`       | Foreign key linking to the sitter being reviewed. |
| `reviewer_id`| `UUID`                    | `NOT NULL`, `REFERENCES public.profiles(id)`       | Foreign key linking to the user leaving the review. |
| `rating`    | `INTEGER`                  | `NOT NULL`, `CHECK (rating >= 1 AND rating <= 5)` | The numerical rating (1-5 stars).                |
| `comment`   | `TEXT`                     |                                                    | Optional textual comment for the review.         |
| `created_at`| `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT now()`                        | Timestamp of review creation.                    |
| `updated_at`| `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT now()`                        | Timestamp of last review update.                 |

**Relationships:**

*   Many-to-One: A review is for one `profiles` (sitter).
*   Many-to-One: A review is written by one `profiles` (reviewer).

**Row Level Security (RLS):**

*   Enabled: Yes
*   Policies:
    *   `SELECT`: Anyone can view reviews (`USING (true)`).
    *   `INSERT`: Users can insert reviews where they are the reviewer (`auth.uid() = reviewer_id`).
    *   `UPDATE`: Users can update their own reviews (`auth.uid() = reviewer_id`).
    *   `DELETE`: Users can delete their own reviews (`auth.uid() = reviewer_id`).

**Indexes:**

*   `reviews_sitter_id_idx`: On `sitter_id` for fetching reviews for a specific sitter.
*   `reviews_reviewer_id_idx`: On `reviewer_id` for fetching reviews by a specific user.

**Triggers:**

*   `set_timestamp`: Before `UPDATE`, executes `public.trigger_set_timestamp()` to update the `updated_at` column.

---

## Payment Integration

*   **Purpose:** Adds fields to support Stripe payment processing.
*   **SQL Files:** `20250324_add_stripe_ids.sql`, `20250324_add_payment_intent_id.sql`

**Changes:**

1.  **`public.profiles` Table:**
    *   Added `stripe_customer_id` (`TEXT`): To store the Stripe Customer ID for users making payments (owners).
    *   Added `stripe_account_id` (`TEXT`): To store the Stripe Connected Account ID for users receiving payments (sitters).
2.  **`public.walking_bookings` Table:**
    *   Added `payment_intent_id` (`TEXT`): To link a specific walking booking to a Stripe Payment Intent for tracking payment status.

---

## Storage

### `avatars` Bucket

*   **Purpose:** Stores user profile pictures (avatars).
*   **SQL File:** `20250325_create_avatars_bucket.sql`
*   **Type:** Supabase Storage Bucket
*   **ID:** `avatars`
*   **Name:** `avatars`
*   **Public:** Yes (`true`) - Allows public read access URLs.

**Storage Policies (Row Level Security for `storage.objects`):**

*   **SELECT:**
    *   Users can view their own avatar (`auth.uid() = owner`).
    *   Anyone can view objects in public buckets (since this bucket is public).
*   **INSERT:** Users can upload objects only if they are the owner (`auth.uid() = owner`).
*   **UPDATE:** Users can update objects only if they are the owner (`auth.uid() = owner`).
*   **DELETE:** Users can delete objects only if they are the owner (`auth.uid() = owner`).

---

## Shared Functions & Triggers

Several common functions and triggers are used across tables, primarily for managing the `updated_at` timestamp.

1.  **`public.trigger_set_timestamp()`**
    *   **Purpose:** Function to set the `updated_at` column of the triggering row to the current time (`now()`).
    *   **Used By Triggers:**
        *   `set_timestamp` on `public.pets` (BEFORE UPDATE)
        *   `set_timestamp` on `public.reviews` (BEFORE UPDATE)

2.  **`public.handle_updated_at()`**
    *   **Purpose:** Similar to `trigger_set_timestamp`, sets the `updated_at` column to `NOW()`. Seems functionally equivalent, potentially created for consistency or specific contexts.
    *   **Used By Triggers:**
        *   `set_addresses_updated_at` on `public.addresses` (BEFORE UPDATE)
        *   `set_boarding_bookings_updated_at` on `public.boarding_bookings` (BEFORE UPDATE)
        *   `set_boarding_availability_updated_at` on `public.boarding_availability` (BEFORE UPDATE)

3.  **`update_walking_bookings_updated_at()`**
    *   **Purpose:** Specifically sets the `updated_at` column on the `walking_bookings` table to `NOW()`.
    *   **Used By Triggers:**
        *   `update_walking_bookings_updated_at` on `walking_bookings` (BEFORE UPDATE)

4.  **`update_thread_last_message()`**
    *   **Purpose:** Updates the `last_message`, `last_message_time`, and `updated_at` columns in the `message_threads` table based on a newly inserted message in the `messages` table.
    *   **Used By Triggers:**
        *   `trigger_update_thread_last_message` on `messages` (AFTER INSERT)

---

## Key Relationships Summary

*   **Users/Profiles:** The `public.profiles` table (assumed) is central, linking to `pets`, `addresses` (via `auth.users`), `walking_bookings` (as owner/sitter), `boarding_bookings` (as owner/sitter), `boarding_availability` (as sitter), `message_threads` (as owner/sitter), `messages` (as sender), and `reviews` (as sitter/reviewer).
*   **Bookings:** `walking_bookings` and `boarding_bookings` link owners, sitters, and potentially pets and availability slots.
*   **Messaging:** `message_threads` connect owners and sitters, with `messages` storing the conversation content. Threads can optionally link to `walking_bookings`.
*   **Pets & Addresses:** Belong directly to users (`profiles` or `auth.users`).
*   **Reviews:** Link reviewers (owners) to sitters.

---

This README provides a detailed overview based on the SQL migration files. Remember that tables like `profiles` and `sitter_weekly_availability` are referenced but not defined here, and specific RLS policies for messaging tables were not included in the provided files.