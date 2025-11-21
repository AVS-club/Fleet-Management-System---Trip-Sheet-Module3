import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🚀 Starting KPI refresh...')
    const startTime = performance.now()

    // Try the new function with comparisons, fallback to basic if it doesn't exist
    let { data, error } = await supabase.rpc('generate_kpi_cards_with_comparisons')
    
    // If the new function doesn't exist yet, use the original
    if (error && error.message.includes('does not exist')) {
      const result = await supabase.rpc('generate_kpi_cards')
      data = result.data
      error = result.error
    }

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

