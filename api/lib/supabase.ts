import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabaseBucket = process.env.SUPABASE_STORAGE_BUCKET || 'product-images'
export const supabasePromoBucket = process.env.SUPABASE_PROMO_BUCKET || 'promo-images'
export const supabasePaymentBucket = process.env.SUPABASE_PAYMENT_BUCKET || 'payment-proofs'

export const supabase =
  url && serviceKey
    ? createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      })
    : null
