import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Get the webhook data
        const webhookData = await req.json()

        console.log('🔔 Webhook recebido:', JSON.stringify(webhookData, null, 2))

        // Create Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Extract data from webhook
        const action = webhookData.action
        const type = webhookData.type
        const data = webhookData.data
        const paymentId = data?.id
        const preferenceId = webhookData.preference_id

        console.log('📊 Dados extraídos:', { action, type, paymentId, preferenceId })

        // Determine status based on action
        let status = 'pending'
        if (action === 'updated' || type === 'payment') {
            status = 'approved'
        }

        // Find payment by preference_id or payment_id
        let { data: payment, error: findError } = await supabase
            .from('payments')
            .select('*')
            .or(`mercado_pago_preference_id.eq.${preferenceId},mercado_pago_payment_id.eq.${paymentId}`)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (findError || !payment) {
            console.log('❌ Pagamento não encontrado para:', { preferenceId, paymentId })
            return new Response(
                JSON.stringify({ error: 'Pagamento não encontrado' }),
                {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Update payment
        const { data: updatedPayment, error: updateError } = await supabase
            .from('payments')
            .update({
                status: status,
                mercado_pago_payment_id: paymentId || payment.mercado_pago_payment_id,
                updated_at: new Date().toISOString()
            })
            .eq('id', payment.id)
            .select()
            .single()

        if (updateError) {
            console.log('❌ Erro ao atualizar pagamento:', updateError)
            return new Response(
                JSON.stringify({ error: 'Erro ao atualizar pagamento' }),
                {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        console.log('✅ Pagamento atualizado:', { id: payment.id, status })

        // If payment is approved, activate subscription
        if (status === 'approved') {
            const planId = payment.description?.match(/plano ([a-f0-9-]+)/)?.[1]
            const userId = payment.user_id

            if (planId && userId) {
                const { error: subscriptionError } = await supabase
                    .from('user_subscriptions')
                    .upsert({
                        user_id: userId,
                        plan_id: planId,
                        status: 'active',
                        start_date: new Date().toISOString(),
                        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
                        payment_id: payment.id,
                        mercado_pago_subscription_id: paymentId
                    })

                if (subscriptionError) {
                    console.log('❌ Erro ao ativar assinatura:', subscriptionError)
                } else {
                    console.log('✅ Assinatura ativada para usuário:', userId)
                }
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                payment_id: payment.id,
                status
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )

    } catch (error) {
        console.log('❌ Erro no webhook:', error)
        return new Response(
            JSON.stringify({ error: 'Erro interno do servidor' }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
}) 