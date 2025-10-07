# Stripe Payment Integration Setup

## Required Environment Variables

Create a `.env` file in the Tourist Website directory with the following variables:

```env
# Stripe Configuration
# Get these from https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# MongoDB Connection
MONGODB_URI=mongodb+srv://mesum357:pDliM118811@cluster0.h3knh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

# Session Secret
SESSION_SECRET=your_session_secret_here
```

## Stripe Setup Steps

1. **Create a Stripe Account**
   - Go to https://stripe.com and create an account
   - Complete the account verification process

2. **Get API Keys**
   - Go to https://dashboard.stripe.com/apikeys
   - Copy your Publishable key (starts with `pk_test_`)
   - Copy your Secret key (starts with `sk_test_`)

3. **Update the Code**
   - Replace `pk_test_your_stripe_publishable_key` in `payment.ejs` with your actual publishable key
   - Add your secret key to the `.env` file

4. **Test the Integration**
   - Use Stripe's test card numbers for testing:
     - Success: 4242 4242 4242 4242
     - Decline: 4000 0000 0000 0002
     - Requires authentication: 4000 0025 0000 3155

## Features Implemented

✅ **Booking Schema** - Complete booking data structure with customer info, travel details, and payment info
✅ **Stripe Payment Integration** - Secure payment processing with Stripe Elements
✅ **Booking Receipt Popup** - Detailed confirmation modal after successful payment
✅ **Profile Bookings Section** - User can view all their bookings with status tracking
✅ **Real-time Price Calculation** - Dynamic pricing based on number of travelers
✅ **Form Validation** - Client-side and server-side validation
✅ **Error Handling** - Comprehensive error handling for payment failures

## API Endpoints

- `POST /api/create-payment-intent` - Creates Stripe payment intent
- `POST /api/bookings` - Creates new booking after successful payment
- `GET /api/bookings` - Gets user's bookings
- `GET /api/bookings/:id` - Gets specific booking details
- `GET /profile` - User profile page with bookings

## Database Schema

The booking schema includes:
- Customer information (name, email, phone, nationality)
- Travel details (dates, travelers, special requests)
- Payment information (amount, Stripe IDs, status)
- Emergency contact information
- Automatic booking number generation
