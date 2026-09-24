// src/backend/services/automation/AutomationDispatcher.js
// Native Revenue Automation Engine Local Dispatcher (Make-free)

const { getSupabaseClient } = require('../../infrastructure/database/supabaseClient');
const { createDraftInvoice } = require('../stripeInvoiceService');

/**
 * Execute automation job locally by updating local database schemas.
 * Replaces Make.com scenarios for the central flow.
 */
async function processJobLocally(tenantId, jobType, payload) {
  const supabase = getSupabaseClient();
  const log = [];

  try {
    switch (jobType) {
      case 'leadhub_sync': {
        // Pull contact leads or fetch updates locally
        log.push('Executing leadhub_sync natively');
        break;
      }

      case 'lead_qualification': {
        const { leadId } = payload;
        if (!leadId) throw new Error('leadId is required');
        
        const executionPipeline = require('../../application/orchestrator/ExecutionPipeline');
        const result = await executionPipeline.execute({
          organizationId: tenantId,
          agentName: 'lead_qualifier',
          input: { leadId },
          supabaseClient: supabase
        });
        
        if (!result.success) {
          throw new Error(`Lead qualification agent failed: ${result.error || 'Unknown error'}`);
        }
        
        if (result.output?.skip) {
          log.push(`Lead qualification skipped: ${result.output.reason}`);
        } else {
          log.push(`Lead qualified: score=${result.output.score}, status=${result.output.status}`);
        }
        break;
      }
 
      case 'call_transcription': {
        throw new Error('transcripción no disponible');
      }

      case 'proposal_generation': {
        const { dealId, title, amount } = payload;
        if (supabase && dealId) {
          const { data: proposal } = await supabase.from('proposals').insert({
            organization_id: tenantId,
            deal_id: dealId,
            title,
            monthly_amount: parseFloat(amount.replace(/[^0-9.]/g, '')) || 4500,
            status: 'draft'
          }).select().single();
          
          log.push(`Generated proposal draft ${proposal?.id} for deal ${dealId}`);
        }
        break;
      }

      case 'contract_generation': {
        const { proposalId } = payload;
        if (supabase && proposalId) {
          await supabase.from('contracts').insert({
            organization_id: tenantId,
            proposal_id: proposalId,
            template_key: 'standard_consulting',
            status: 'draft'
          });
          log.push(`Generated standard contract draft for proposal ${proposalId}`);
        }
        break;
      }

      case 'stripe_invoice_draft': {
        const { proposalId, client } = payload;
        if (proposalId && client) {
          const invoiceDetails = await createDraftInvoice(tenantId, {
            clientName: client.name,
            clientEmail: client.email,
            clientCompany: client.company,
            amount: payload.amount || '4500',
            description: `Invoice draft for proposal ID: ${proposalId}`
          });

          if (supabase) {
            await supabase.from('invoices').insert({
              organization_id: tenantId,
              proposal_id: proposalId,
              stripe_invoice_id: invoiceDetails.stripeInvoiceId,
              amount: parseFloat(invoiceDetails.amount),
              status: 'draft'
            });
          }
          log.push(`Created Stripe Invoice Draft ${invoiceDetails.stripeInvoiceId}`);
        }
        break;
      }

      case 'client_workspace_provision': {
        const { client, proposalId } = payload;
        if (supabase && client) {
          const clientSlug = `client-${client.company?.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
          // `organizations` no tiene columnas owner_email ni created_by_tenant:
          // escribirlas hacía fallar este insert, y con él todo el
          // aprovisionamiento, antes siquiera de llegar a client_workspaces.
          // Los dos datos ya viven en esa tabla —client_email y
          // provider_tenant_id—, así que duplicarlos aquí sólo daría ocasión
          // de que se desincronizaran.
          const { data: org, error: orgError } = await supabase.from('organizations').insert({
            name: client.company || client.name,
            slug: clientSlug,
            // 'client' no es un plan: el CHECK de organizations sólo admite
            // free, pro, agency y enterprise, así que ese valor hacía fallar el
            // insert. La organización de un cliente final no paga nada —quien
            // paga es el coach— y lo que la marca como workspace de cliente no
            // es su plan sino la fila de client_workspaces que la apunta.
            plan_tier: 'free'
          }).select().single();

          // El error se propaga en vez de tragarse: sin organización no hay
          // workspace, y el `if (org)` de abajo convertía el fallo en un
          // silencio que dejaba la propuesta aprobada sin portal de cliente.
          if (orgError) {
            throw new Error(`No se pudo crear la organización del cliente: ${orgError.message}`);
          }

          const { error: wsError } = await supabase.from('client_workspaces').insert({
            organization_id: org.id,
            provider_tenant_id: tenantId,
            client_name: client.name,
            client_email: client.email,
            client_company: client.company,
            status: 'active',
            proposal_id: proposalId
          });
          if (wsError) {
            throw new Error(`No se pudo crear el workspace del cliente: ${wsError.message}`);
          }
          log.push(`Provisioned client workspace organization: ${clientSlug}`);
        }
        break;
      }

      default:
        throw new Error(`Unsupported native job type: ${jobType}`);
    }

    return { success: true, log };
  } catch (err) {
    console.error(`[NativeDispatcher] Error on job ${jobType}:`, err.message);
    return { success: false, error: err.message, log };
  }
}

/**
 * Dispatches and logs automation jobs into local database automation_jobs table.
 */
async function dispatchNative(tenantId, jobType, payload) {
  const supabase = getSupabaseClient();
  let jobRecord = null;

  if (supabase) {
    const { data } = await supabase.from('automation_jobs').insert({
      organization_id: tenantId,
      job_type: jobType,
      payload,
      status: 'pending'
    }).select().single();
    jobRecord = data;
  }

  const jobId = jobRecord?.id || 'local-job-id';
  
  if (supabase && jobRecord) {
    await supabase.from('automation_jobs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', jobId);
  }

  const result = await processJobLocally(tenantId, jobType, payload);

  if (supabase && jobRecord) {
    await supabase.from('automation_jobs')
      .update({
        status: result.success ? 'completed' : 'failed',
        result: result,
        error_message: result.error || null,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }

  // Un job fallido no puede devolverse como si nada: quien llama tiene un
  // try/catch y responde 500. Antes se devolvia {success:false} y las rutas lo
  // ignoraban, asi que el coach veia "Aprobado" con el lead sin calificar.
  if (!result.success) {
    const err = new Error(result.error || `El job '${jobType}' fallo sin mensaje de error.`);
    err.jobId = jobId;
    err.jobType = jobType;
    err.details = result;
    throw err;
  }

  return {
    success: true,
    jobId,
    details: result
  };
}

module.exports = {
  dispatchNative
};
