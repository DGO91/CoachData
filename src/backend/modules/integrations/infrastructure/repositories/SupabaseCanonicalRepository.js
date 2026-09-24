'use strict';

const { ICanonicalRepository } = require('../../application/ports/ICanonicalRepository');
const { TABLE_MAP }            = require('../../domain/EntityTypes');

/**
 * SupabaseCanonicalRepository — persists and queries canonical events
 * using a service_role Supabase client (bypasses RLS for writes).
 */
class SupabaseCanonicalRepository extends ICanonicalRepository {
  /**
   * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient — service_role client
   */
  constructor(supabaseClient) {
    super();
    if (!supabaseClient) throw new Error('SupabaseCanonicalRepository requires a supabaseClient');
    this._client = supabaseClient;
  }

  /**
   * Upsert a canonical event. Uses ON CONFLICT (organization_id, source_provider, source_id)
   * with ignoreDuplicates: true for idempotency.
   *
   * @param {import('../../domain/CanonicalEvent').CanonicalEvent} event
   */
  async upsert(event) {
    const table = TABLE_MAP[event.entityType];
    if (!table) {
      throw new Error(`No table mapping for entityType: "${event.entityType}"`);
    }

    const row = event.toRow();

    const { error } = await this._client
      .from(table)
      .upsert(row, {
        onConflict: 'organization_id,source_provider,source_id',
        ignoreDuplicates: true,
      });

    if (error) {
      throw new Error(`[SupabaseCanonicalRepository] upsert into ${table} failed: ${error.message}`);
    }
  }

  /**
   * Find canonical records by organization.
   *
   * @param {'contact'|'payment'|'session'|'form_entry'} entityType
   * @param {string} organizationId
   * @param {object} [options]
   * @param {number} [options.limit]
   * @param {string} [options.sourceProvider]
   * @returns {Promise<object[]>}
   */
  async findByOrg(entityType, organizationId, options = {}) {
    const table = TABLE_MAP[entityType];
    if (!table) {
      throw new Error(`No table mapping for entityType: "${entityType}"`);
    }

    let query = this._client
      .from(table)
      .select('*')
      .eq('organization_id', organizationId)
      .order('ingested_at', { ascending: false });

    if (options.sourceProvider) {
      query = query.eq('source_provider', options.sourceProvider);
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`[SupabaseCanonicalRepository] findByOrg ${table} failed: ${error.message}`);
    }
    return data || [];
  }
}

module.exports = { SupabaseCanonicalRepository };
