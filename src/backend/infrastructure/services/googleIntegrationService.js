const { google } = require('googleapis');
const { getSupabaseClient } = require('../database/supabaseClient');
const { decrypt, encrypt } = require('./encryptionService');
const { getGoogleOAuthClient } = require('../../application/auth/googleAuthUseCase');

async function getAuthenticatedOAuth2Client(tenantId, providerName = 'google_mail_oauth') {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Database connection uninitialized');

  // Candidate IDs across multi-tenant organizations and legacy tenants
  const candidateIds = [tenantId];

  // 1. If tenantId is an organization_id, add member user_ids
  const { data: members } = await supabase
    .from('organization_memberships')
    .select('user_id, organization_id')
    .or(`organization_id.eq.${tenantId},user_id.eq.${tenantId}`);

  if (members && members.length > 0) {
    members.forEach(m => {
      if (m.organization_id && !candidateIds.includes(m.organization_id)) candidateIds.push(m.organization_id);
      if (m.user_id && !candidateIds.includes(m.user_id)) candidateIds.push(m.user_id);
    });
  }

  // 2. Also add legacy tenant rows
  const { data: legacyRows } = await supabase
    .from('tenants')
    .select('id, auth_user_id')
    .or(candidateIds.map(id => `id.eq.${id},auth_user_id.eq.${id}`).join(','));

  if (legacyRows && legacyRows.length > 0) {
    legacyRows.forEach(lr => {
      if (lr.id && !candidateIds.includes(lr.id)) candidateIds.push(lr.id);
      if (lr.auth_user_id && !candidateIds.includes(lr.auth_user_id)) candidateIds.push(lr.auth_user_id);
    });
  }

  const altProvider = providerName === 'google_mail_oauth' ? 'google_calendar_oauth' : 'google_mail_oauth';

  const { data: records } = await supabase
    .from('client_provider_keys')
    .select('tenant_id, provider_name, api_key_encrypted')
    .in('tenant_id', candidateIds)
    .in('provider_name', [providerName, altProvider]);

  if (!records || records.length === 0) {
    return null; // Not connected yet
  }

  // Prioritize exact provider match, else fallback to alternate Google provider
  let record = records.find(r => r.provider_name === providerName) || records[0];

  if (!record || !record.api_key_encrypted) {
    return null;
  }

  let tokenData;
  try {
    const decryptedJson = decrypt(record.api_key_encrypted);
    tokenData = JSON.parse(decryptedJson);
  } catch (e) {
    console.error('[GoogleIntegration] Failed to decrypt token for tenant:', tenantId, e);
    return null;
  }

  const oauth2Client = getGoogleOAuthClient();
  if (!oauth2Client) throw new Error('Server Google OAuth Client not configured');

  oauth2Client.setCredentials({
    access_token: tokenData.token,
    refresh_token: tokenData.refresh_token,
    expiry_date: new Date(tokenData.expiry).getTime()
  });

  oauth2Client.on('tokens', async (tokens) => {
    try {
      console.log(`[GoogleIntegration] Tokens refreshed for tenant: ${tenantId}`);
      const updatedTokenData = {
        ...tokenData,
        token: tokens.access_token,
        refresh_token: tokens.refresh_token || tokenData.refresh_token,
        expiry: new Date(tokens.expiry_date || Date.now() + 3600000).toISOString()
      };
      
      const encryptedToken = encrypt(JSON.stringify(updatedTokenData));
      
      await supabase
        .from('client_provider_keys')
        .update({ api_key_encrypted: encryptedToken, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('provider_name', providerName);
        
    } catch (err) {
      console.error('[GoogleIntegration] Error saving refreshed tokens:', err);
    }
  });

  return oauth2Client;
}

/**
 * Fetch unread priority emails from Gmail API
 */
async function getUnreadEmails(tenantId, limit = 5) {
  const auth = await getAuthenticatedOAuth2Client(tenantId, 'google_mail_oauth');
  if (!auth) return null;

  const gmail = google.gmail({ version: 'v1', auth });
  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: 'is:unread category:primary',
    maxResults: limit
  });

  const messages = listRes.data.messages || [];
  const detailedMessages = [];

  for (const msg of messages) {
    const msgRes = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'full'
    });

    const headers = msgRes.data.payload?.headers || [];
    const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || 'No Subject';
    const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
    const date = headers.find(h => h.name.toLowerCase() === 'date')?.value || '';

    detailedMessages.push({
      id: msg.id,
      threadId: msg.threadId,
      snippet: msgRes.data.snippet || '',
      subject,
      from,
      date
    });
  }

  return detailedMessages;
}

/**
 * Fetch today's events from Google Calendar API
 */
async function getTodayCalendarEvents(tenantId) {
  const auth = await getAuthenticatedOAuth2Client(tenantId, 'google_calendar_oauth');
  if (!auth) return null;

  const calendar = google.calendar({ version: 'v3', auth });
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const eventsRes = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime'
  });

  const items = eventsRes.data.items || [];
  return items.map(item => ({
    id: item.id,
    summary: item.summary || 'Untitled Meeting',
    description: item.description || '',
    start: item.start?.dateTime || item.start?.date,
    end: item.end?.dateTime || item.end?.date,
    attendeesCount: item.attendees?.length || 0,
    htmlLink: item.htmlLink
  }));
}

/**
 * Fetch past 7 days calendar summary
 */
async function getWeeklyCalendarSummary(tenantId) {
  const auth = await getAuthenticatedOAuth2Client(tenantId, 'google_calendar_oauth');
  if (!auth) return null;

  const calendar = google.calendar({ version: 'v3', auth });
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const eventsRes = await calendar.events.list({
    calendarId: 'primary',
    timeMin: sevenDaysAgo.toISOString(),
    timeMax: now.toISOString(),
    singleEvents: true,
    orderBy: 'startTime'
  });

  const items = eventsRes.data.items || [];
  return {
    totalMeetings: items.length,
    completedEvents: items.map(item => ({
      id: item.id,
      summary: item.summary || 'Meeting',
      start: item.start?.dateTime || item.start?.date
    }))
  };
}

/**
 * Send email draft / reply via Gmail API
 */
async function sendEmailReply(tenantId, threadId, to, subject, body) {
  const auth = await getAuthenticatedOAuth2Client(tenantId, 'google_mail_oauth');
  if (!auth) throw new Error('Google Mail account not connected');

  const gmail = google.gmail({ version: 'v1', auth });

  const rawMessage = [
    `To: ${to}`,
    `Subject: Re: ${subject}`,
    `In-Reply-To: ${threadId}`,
    `References: ${threadId}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    body
  ].join('\r\n');

  const encodedMessage = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
      threadId: threadId
    }
  });

  return res.data;
}

module.exports = {
  getAuthenticatedOAuth2Client,
  getUnreadEmails,
  getTodayCalendarEvents,
  getWeeklyCalendarSummary,
  sendEmailReply
};
