import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🚀 Starting KPI refresh...')
    const startTime = performance.now()

    const { data, error } = await supabase.rpc('generate_kpi_cards')

    if (error) throw error

    const endTime = performance.now()
    const duration = Math.round(endTime - startTime)

    console.log('✅ Success! Created', data.cards_created, 'cards in', duration, 'ms')

    return new Response(
      JSON.stringify({
        success: true,
        cards_created: data.cards_created,
        execution_time_ms: duration,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Error:', error.message)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

