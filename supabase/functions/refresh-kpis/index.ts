import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🚀 Starting KPI refresh...')
    const startTime = performance.now()

    // Call the main KPI generation function
    console.log('📊 Generating basic KPIs...')
    const { data: kpiData, error: kpiError } = await supabase.rpc('generate_kpi_cards')
    if (kpiError) {
      console.error('❌ Basic KPI error:', kpiError)
      throw kpiError
    }
    console.log('✅ Basic KPIs created:', kpiData?.cards_created || 0)

    // Call the comparative KPI generation function
    console.log('📈 Generating comparative KPIs...')
    const { data: comparativeKpiData, error: comparativeKpiError } = await supabase.rpc('generate_comparative_kpis')
    if (comparativeKpiError) {
      console.error('❌ Comparative KPI error:', comparativeKpiError)
      throw comparativeKpiError
    }
    console.log('✅ Comparative KPIs created:', comparativeKpiData?.cards_created || 0)

    const endTime = performance.now()
    const duration = Math.round(endTime - startTime)

    const totalCardsCreated = (kpiData?.cards_created || 0) + (comparativeKpiData?.cards_created || 0)

    console.log('✅ Success! Created', totalCardsCreated, 'total cards in', duration, 'ms')

    return new Response(
      JSON.stringify({
        success: true,
        cards_created: totalCardsCreated,
        basic_kpis: kpiData?.cards_created || 0,
        comparative_kpis: comparativeKpiData?.cards_created || 0,
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

