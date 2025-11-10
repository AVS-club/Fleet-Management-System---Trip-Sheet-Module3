// Supabase Edge Function to get pending reminders for n8n
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Parse request parameters
    const url = new URL(req.url)
    const organizationId = url.searchParams.get('organization_id')
    const notificationMethod = url.searchParams.get('method') || 'email' // email or sms
    const daysAhead = parseInt(url.searchParams.get('days_ahead') || '7') // Look ahead days
    const limit = parseInt(url.searchParams.get('limit') || '100')

    if (!organizationId) {
      throw new Error('organization_id is required')
    }

    // Calculate date range
    const now = new Date()
    const futureDate = new Date()
    futureDate.setDate(now.getDate() + daysAhead)

    // Get active reminders that are due within the specified days
    // and haven't been notified yet (or last notification was > 24 hours ago)
    const { data: reminders, error: remindersError } = await supabaseClient
      .from('reminder_tracking')
      .select(`
        id,
        reminder_id,
        reminder_type,
        entity_id,
        entity_type,
        module,
        title,
        due_date,
        days_left,
        priority,
        link,
        metadata,
        created_at
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .lte('due_date', futureDate.toISOString())
      .order('due_date', { ascending: true })
      .limit(limit)

    if (remindersError) throw remindersError

    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          count: 0,
          reminders: [],
          message: 'No pending reminders found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For each reminder, check if notification was already sent in last 24 hours
    const reminderIds = reminders.map(r => r.reminder_id)
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    const { data: recentNotifications, error: notifError } = await supabaseClient
      .from('reminder_notifications')
      .select('reminder_id, sent_at')
      .in('reminder_id', reminderIds)
      .eq('notification_method', notificationMethod)
      .eq('status', 'sent')
      .gte('sent_at', twentyFourHoursAgo.toISOString())

    if (notifError) throw notifError

    // Create a set of reminder_ids that were recently notified
    const recentlyNotifiedIds = new Set(
      recentNotifications?.map(n => n.reminder_id) || []
    )

    // Filter out reminders that were recently notified
    const pendingReminders = reminders.filter(
      r => !recentlyNotifiedIds.has(r.reminder_id)
    )

    // Enrich reminders with contact information based on reminder type
    const enrichedReminders = await Promise.all(
      pendingReminders.map(async (reminder) => {
        // Get contacts assigned to this reminder type
        const { data: contacts, error: contactsError } = await supabaseClient
          .from('reminder_contacts')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('is_active', true)

        if (contactsError) {
          console.error('Error fetching contacts:', contactsError)
        }

        // Filter contacts by reminder type and preferred method
        const relevantContacts = contacts?.filter(contact => {
          // Check if contact has this reminder type assigned
          const hasType = contact.assigned_types?.some(
            (at: any) => at.reminder_type?.toLowerCase() === reminder.reminder_type?.toLowerCase()
          )

          // Check if contact prefers this notification method
          const prefersMethod =
            notificationMethod === 'email'
              ? (contact.preferred_contact_mode === 'Email' || contact.preferred_contact_mode === 'Both') && contact.email
              : (contact.preferred_contact_mode === 'SMS' || contact.preferred_contact_mode === 'Both') && contact.phone_number

          return (hasType || contact.is_global) && prefersMethod
        }) || []

        // Get template for this reminder type
        const { data: templates, error: templateError } = await supabaseClient
          .from('reminder_templates')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('reminder_type', reminder.reminder_type)
          .limit(1)
          .single()

        if (templateError && templateError.code !== 'PGRST116') {
          console.error('Error fetching template:', templateError)
        }

        return {
          ...reminder,
          contacts: relevantContacts.map(c => ({
            id: c.id,
            name: c.full_name,
            email: c.email,
            phone: c.phone_number,
            position: c.position,
            duty: c.duty
          })),
          template: templates ? {
            subject: templates.subject_template,
            message: templates.message_template
          } : null
        }
      })
    )

    // Filter out reminders with no contacts
    const remindersWithContacts = enrichedReminders.filter(
      r => r.contacts && r.contacts.length > 0
    )

    return new Response(
      JSON.stringify({
        success: true,
        count: remindersWithContacts.length,
        reminders: remindersWithContacts,
        notification_method: notificationMethod,
        days_ahead: daysAhead,
        organization_id: organizationId
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
