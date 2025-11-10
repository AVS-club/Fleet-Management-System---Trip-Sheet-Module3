// Supabase Edge Function to mark a notification as sent
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const {
      reminder_id,
      entity_id,
      entity_type,
      reminder_type,
      notification_method,
      recipient_email,
      recipient_phone,
      recipient_name,
      subject,
      message_body,
      template_used,
      status,
      error_message,
      n8n_execution_id,
      organization_id,
      metadata
    } = await req.json()

    if (!reminder_id || !organization_id) {
      throw new Error('reminder_id and organization_id are required')
    }

    const notificationData: any = {
      reminder_id,
      entity_id,
      entity_type,
      reminder_type,
      notification_method,
      recipient_email,
      recipient_phone,
      recipient_name,
      subject,
      message_body,
      template_used,
      status: status || 'sent',
      n8n_execution_id,
      organization_id,
      metadata: metadata || {}
    }

    if (status === 'sent') {
      notificationData.sent_at = new Date().toISOString()
    } else if (status === 'failed') {
      notificationData.failed_at = new Date().toISOString()
      notificationData.error_message = error_message
    }

    const { data, error } = await supabaseClient
      .from('reminder_notifications')
      .insert(notificationData)
      .select()
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify({
        success: true,
        notification: data
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
