/**
 * OrganizationWhatsAppDeliveryService.js
 * Multi-Tenant WhatsApp Delivery Engine — CoachData Operational OS v2
 */

const { getEffectiveAISettings } = require('../../application/orchestrator/helpers/getEffectiveAISettings');
const { buildWhatsAppReportTemplate } = require('../../application/orchestrator/reporting/buildWhatsAppReportTemplate');

function maskPhone(phone = '') {
  if (!phone || phone.length < 6) return '***';
  return phone.substring(0, 3) + '***' + phone.substring(phone.length - 2);
}

class OrganizationWhatsAppDeliveryService {
  constructor(provider = null) {
    this.provider = provider || {
      send: async ({ to, body }) => {
        // Default Provider Simulation / Webhook dispatch
        return { success: true, messageId: `msg_${Date.now()}` };
      }
    };
  }

  async sendOrganizationReport({
    organizationId,
    reportType = 'DAILY_OPERATIONS',
    recipientPhone,
    payload = {}
  }) {
    if (!organizationId) {
      throw new Error('sendOrganizationReport requires organizationId');
    }

    const maskedPhone = maskPhone(recipientPhone);

    try {
      // 1. Fetch multi-tenant settings
      const settings = await getEffectiveAISettings(organizationId);

      // 2. Build organization-scoped report message
      const messageBody = buildWhatsAppReportTemplate({
        organizationSettings: settings,
        reportType,
        metrics: payload.metrics || {},
        recommendations: payload.recommendations || [],
        generatedAt: payload.generatedAt || new Date()
      });

      // 3. Deliver message via WhatsApp Provider
      const deliveryResult = await this.provider.send({
        to: recipientPhone,
        body: messageBody
      });

      // 4. Structured JSON log
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'whatsapp_report_sent',
        organizationId,
        reportType,
        recipientPhoneMasked: maskedPhone,
        assistantName: settings.assistant_name,
        businessName: settings.business_name,
        deliveryStatus: 'SUCCESS',
        messageId: deliveryResult?.messageId || null
      }));

      return {
        success: true,
        organizationId,
        reportType,
        messageBody,
        deliveryResult
      };
    } catch (error) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'whatsapp_report_failed',
        organizationId,
        reportType,
        recipientPhoneMasked: maskedPhone,
        error: error.message
      }));

      return {
        success: false,
        organizationId,
        reportType,
        error: error.message
      };
    }
  }
}

module.exports = new OrganizationWhatsAppDeliveryService();
module.exports.OrganizationWhatsAppDeliveryService = OrganizationWhatsAppDeliveryService;
