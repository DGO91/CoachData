'use strict';

/**
 * EntityTypes — canonical entity type constants.
 * Every connector maps source events to one of these four types.
 */
const EntityTypes = Object.freeze({
  CONTACT:    'contact',
  PAYMENT:    'payment',
  SESSION:    'session',
  FORM_ENTRY: 'form_entry',
});

/**
 * Maps entity type → canonical table name in Supabase.
 */
const TABLE_MAP = Object.freeze({
  [EntityTypes.CONTACT]:    'canonical_contact',
  [EntityTypes.PAYMENT]:    'canonical_payment',
  [EntityTypes.SESSION]:    'canonical_session',
  [EntityTypes.FORM_ENTRY]: 'canonical_form_entry',
});

module.exports = { EntityTypes, TABLE_MAP };
