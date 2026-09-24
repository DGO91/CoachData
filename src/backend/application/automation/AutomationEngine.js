// src/backend/application/automation/AutomationEngine.js
const DeliverableApprovedHandler = require('./handlers/DeliverableApprovedHandler');
const DeliverableRevisionHandler = require('./handlers/DeliverableRevisionHandler');
const ClientCommentHandler = require('./handlers/ClientCommentHandler');

/**
 * AutomationEngine: Central Event Bus & Reactive Automation Orchestrator (Phase 7.3)
 */
class AutomationEngine {
  static async dispatch(eventType, payload) {
    console.log(`[AutomationEngine] Dispatching event: ${eventType}`);

    switch (eventType) {
      case 'deliverable_approved':
        return await DeliverableApprovedHandler.handle(payload);

      case 'deliverable_revision_requested':
        return await DeliverableRevisionHandler.handle(payload);

      case 'comment_created':
        return await ClientCommentHandler.handle(payload);

      default:
        console.warn(`[AutomationEngine] Unhandled event type: ${eventType}`);
        return { success: false, reason: 'unknown_event' };
    }
  }
}

module.exports = AutomationEngine;
