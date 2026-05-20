/**
 * GET /kinora-admin/api/pazienti
 *
 * Mirrors the data-extraction logic that the DASHBOARD (Resilients
 * Customer Service section) uses for the Pazienti list. Key correct
 * joins documented in /Users/valerio/Documents/APP DEV/DASHBOARD/src/
 * lib/str-db/patients.ts:
 *
 *  - PATIENT → CUSTOMER → USER chain:
 *      user_patient.customer_id → user_customer.id
 *      user_customer.user_id    → user_user.id  (the PAYER / account)
 *
 *  - MARKETPLACE is on user_user (the payer), NOT on user_customer:
 *      user_user_marketplaces.user_id → user_user.id
 *      → core_marketplace
 *
 *  - THERAPIST assignment chains through user_employee (not user_user
 *    directly): assignment_assignedtherapist.therapist_id is
 *    user_employee.id; we join user_employee then user_user via
 *    employee.user_id. Joining directly to user_user picks the wrong
 *    person (some customer with the same numeric id).
 *
 *  - BUSINESS STATUS combines THREE signals:
 *      customer.status ∈ {ACT, INA, CAN}
 *      user.is_active  ∈ {true, false}
 *      latest subscription end_date vs CURRENT_DATE
 *    A patient is ACTIVO only when all three say so.
 *
 *  - Three therapist roles per patient (THP_PHY / THP_LTH / THP_CNS):
 *    physiotherapist, speech-and-language, counselor. The UI shows
 *    the physiotherapist as primary; the other two are surfaced on
 *    the patient detail page.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { verifyStaffCaller } from '../../_lib/staff-gate-server';
import { Client } from 'pg';

export type BusinessStatus =
  | 'ACTIVO'
  | 'PERDIDO_CANCELADO'
  | 'INACTIVO'
  | 'REVISION_MANUAL';

interface PatientRow {
  id: number | string;
  source: 'gestionale' | 'self-signup';
  auth_uid: string | null;
  first_name: string;
  last_name: string;
  email: string;
  gender: string | null;
  city: string | null;
  country_code: string | null;
  marketplace_code: string | null;
  marketplace_name: string | null;
  lesion_type: string | null;
  affected_side: string | null;
  lesion_date: string | null;
  customer_status: string | null;
  user_is_active: boolean | null;
  business_status: BusinessStatus | null;
  // Physiotherapist (primary).
  therapist_phy_name: string | null;
  therapist_phy_role: string | null;
  // Speech and language therapist.
  therapist_lth_name: string | null;
  therapist_lth_role: string | null;
  // Counselor.
  therapist_cns_name: string | null;
  therapist_cns_role: string | null;
  // Legacy aliases (backward compat).
  therapist_name: string | null;
  // tier derived from business_status + plan (care = ACTIVO + paid plan)
  tier: 'care' | 'self' | 'free' | null;
  subscription_active: boolean;
  subscription_plan: string | null;
  created_at: string | null;
}

// 30s cache for Supabase listUsers — admin API has a strict rate limit
// (~30 req/h) and the pazienti page would burn through it on every reload
// during development. Returning an empty user list when the cache is
// missing AND the call fails is acceptable — it just means self-signup
// patients won't merge into the list until the next successful fetch.
type UsersList = Awaited<
  ReturnType<ReturnType<typeof createSupabaseAdminClient>['auth']['admin']['listUsers']>
>['data'];
let usersCache: { value: UsersList; ts: number } | null = null;
const USERS_CACHE_TTL_MS = 30 * 1000;

async function listUsersCached(
  admin: ReturnType<typeof createSupabaseAdminClient>
): Promise<UsersList> {
  if (usersCache && Date.now() - usersCache.ts < USERS_CACHE_TTL_MS) {
    return usersCache.value;
  }
  try {
    const { data, error } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (error) throw error;
    usersCache = { value: data, ts: Date.now() };
    return data;
  } catch (err) {
    // Rate-limited (HTTP 429) or transient — fall back to stale cache if
    // available, otherwise an empty list. We never fail the whole request
    // because of an auth-API hiccup.
    if (usersCache) return usersCache.value;
    console.warn('listUsers failed, returning empty list:', err instanceof Error ? err.message : err);
    return { users: [], aud: 'authenticated' } as unknown as UsersList;
  }
}

let cachedClient: Client | null = null;
async function strDbClient(): Promise<Client> {
  if (cachedClient) return cachedClient;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL non configurata su questo environment');
  const looksValid =
    url.startsWith('postgresql://') &&
    url.includes('@') &&
    !url.includes('METTI_') &&
    !url.includes('INCOLLA_') &&
    !url.includes('.rds.amazonaws.com:');
  if (!looksValid) {
    const prefix = url.slice(0, 13);
    const after = url.substring(13);
    const atIdx = after.indexOf('@');
    const hostPart = atIdx >= 0 ? after.substring(atIdx + 1) : after;
    throw new Error(
      `DATABASE_URL malformata. prefisso="${prefix}" lunghezza=${url.length} host="${hostPart.slice(0, 60)}"`
    );
  }
  const c = new Client({
    connectionString: url.replace('?sslmode=require', ''),
    ssl: false,
    connectionTimeoutMillis: 8000,
  });
  await c.connect();
  cachedClient = c;
  return c;
}

export async function GET(request: NextRequest) {
  try {
    await verifyStaffCaller(request);
    const adminAuth = createSupabaseAdminClient();

    const url = new URL(request.url);
    const search = (url.searchParams.get('q') || '').trim();
    const activeOnly = url.searchParams.get('activeOnly') !== 'false';
    const market = url.searchParams.get('market') || 'all';
    const limit = Math.min(2000, parseInt(url.searchParams.get('limit') || '1500', 10));

    const c = await strDbClient();

    // Therapist lateral subquery template for one role (THP_PHY / LTH / CNS).
    // Picks the most recent active row, joins user_employee then user_user.
    const therapistBlock = (alias: string, prefix: string, type: string) => `
      LEFT JOIN LATERAL (
        SELECT *
          FROM assignment_assignedtherapist ${alias}_inner
         WHERE ${alias}_inner.patient_id = p.id
           AND ${alias}_inner.therapist_type::text = '${type}'
         ORDER BY ${alias}_inner.id DESC
         LIMIT 1
      ) ${alias} ON TRUE
      LEFT JOIN user_employee ${alias}_emp ON ${alias}_emp.id = ${alias}.therapist_id
      LEFT JOIN user_user ${alias}_user ON ${alias}_user.id = ${alias}_emp.user_id
    `;

    const query = `
      WITH last_sub AS (
        SELECT DISTINCT ON (customer_id)
          customer_id, plan, end_date, start_date
        FROM user_subscriptionhistory
        WHERE plan != 'CUS_FRE'
        ORDER BY customer_id, start_date DESC NULLS LAST
      )
      SELECT
        p.id,
        p.first_name,
        p.last_name,
        -- Email del paziente: nel gestionale Resilients user_patient.email
        -- e'' quasi sempre NULL (5/145 attivi). L''email vera e''
        -- sull''account payer in user_user.email (login del gestionale)
        -- — quella e'' la fonte canonica per "Crea login" e "Vivi come".
        COALESCE(NULLIF(p.email, ''), u.email) AS email,
        p.gender::text AS gender,
        p.city,
        cc.code AS country_code,
        mp.code AS marketplace_code,
        mp.name AS marketplace_name,
        p.lesion_type::text AS lesion_type,
        p.affected_side::text AS affected_side,
        p.lesion_date::text AS lesion_date,
        c.status::text AS customer_status,
        u.is_active AS user_is_active,
        -- Business status (matches the dashboard's CS query)
        CASE
          WHEN ls.end_date IS NOT NULL AND ls.end_date >= CURRENT_DATE THEN
            CASE WHEN c.status = 'ACT' AND u.is_active = TRUE THEN 'ACTIVO'
                 WHEN c.status = 'CAN' THEN 'PERDIDO_CANCELADO'
                 WHEN c.status = 'INA' OR u.is_active = FALSE THEN 'INACTIVO'
                 ELSE 'REVISION_MANUAL' END
          WHEN ls.end_date IS NOT NULL AND ls.end_date < CURRENT_DATE THEN
            CASE WHEN c.status = 'CAN' THEN 'PERDIDO_CANCELADO'
                 WHEN c.status = 'INA' OR u.is_active = FALSE THEN 'INACTIVO'
                 ELSE 'PERDIDO_CANCELADO' END
          WHEN ls.end_date IS NULL AND ls.customer_id IS NOT NULL THEN
            CASE WHEN c.status = 'ACT' AND u.is_active = TRUE THEN 'ACTIVO'
                 WHEN c.status = 'CAN' THEN 'PERDIDO_CANCELADO'
                 WHEN c.status = 'INA' OR u.is_active = FALSE THEN 'INACTIVO'
                 ELSE 'REVISION_MANUAL' END
          ELSE 'REVISION_MANUAL'
        END AS business_status,
        ls.plan AS subscription_plan,
        -- Physiotherapist (primary therapist)
        TRIM(CONCAT_WS(' ', ta_phy_user.first_name, ta_phy_user.last_name)) AS therapist_phy_name,
        ta_phy_emp.job_title::text AS therapist_phy_role,
        -- Speech/language
        TRIM(CONCAT_WS(' ', ta_lth_user.first_name, ta_lth_user.last_name)) AS therapist_lth_name,
        ta_lth_emp.job_title::text AS therapist_lth_role,
        -- Counselor
        TRIM(CONCAT_WS(' ', ta_cns_user.first_name, ta_cns_user.last_name)) AS therapist_cns_name,
        ta_cns_emp.job_title::text AS therapist_cns_role
      FROM user_patient p
        JOIN user_customer c ON c.id = p.customer_id
        JOIN user_user u ON u.id = c.user_id
        LEFT JOIN user_user_marketplaces uum ON uum.user_id = u.id
        LEFT JOIN core_marketplace mp ON mp.id = uum.marketplace_id
        LEFT JOIN user_country cc ON cc.id = p.country_id
        LEFT JOIN last_sub ls ON ls.customer_id = c.id
        ${therapistBlock('ta_phy', 'phy', 'THP_PHY')}
        ${therapistBlock('ta_lth', 'lth', 'THP_LTH')}
        ${therapistBlock('ta_cns', 'cns', 'THP_CNS')}
      WHERE ($1::text = '' OR
             p.first_name ILIKE $2 OR
             p.last_name ILIKE $2 OR
             p.email ILIKE $2)
        AND (
          $3::boolean = false
          OR (
            -- Active = has a non-CUS_FRE subscription that's either still
            -- valid (end_date >= today) or open-ended (end_date IS NULL)
            -- AND the customer's commercial state is ACT AND the auth
            -- user is_active = TRUE. Mirrors the CS dashboard's logic.
            ls.customer_id IS NOT NULL
            AND (ls.end_date IS NULL OR ls.end_date >= CURRENT_DATE)
            AND c.status = 'ACT'
            AND u.is_active = TRUE
          )
        )
        AND (
          $5::text = 'all'
          OR ($5::text = 'other' AND mp.code IS NULL)
          OR mp.code = $5::text
        )
      ORDER BY p.last_name ASC NULLS LAST, p.first_name ASC NULLS LAST
      LIMIT $4
    `;

    type RawRow = {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      gender: string | null;
      city: string | null;
      country_code: string | null;
      marketplace_code: string | null;
      marketplace_name: string | null;
      lesion_type: string | null;
      affected_side: string | null;
      lesion_date: string | null;
      customer_status: string | null;
      user_is_active: boolean | null;
      business_status: BusinessStatus;
      subscription_plan: string | null;
      therapist_phy_name: string | null;
      therapist_phy_role: string | null;
      therapist_lth_name: string | null;
      therapist_lth_role: string | null;
      therapist_cns_name: string | null;
      therapist_cns_role: string | null;
    };

    const result = await c.query<RawRow>(query, [
      search,
      `%${search}%`,
      activeOnly,
      limit,
      market,
    ]);

    // Merge with Supabase auth.users to find self-signup patients +
    // resolve auth_uid for internal patients that have already been
    // provisioned via "Crea login". The listUsers admin API has a tight
    // rate limit (we'd burn through it on every page render otherwise),
    // so cache the result for 30 seconds at module scope.
    const internalEmails = new Set(
      result.rows.map((r) => (r.email || '').toLowerCase().trim()).filter(Boolean)
    );
    const usersPage = await listUsersCached(adminAuth);

    const authByEmail = new Map<
      string,
      { uid: string; tier: string | null; patientId: number | null; created_at: string }
    >();
    const selfSignups: PatientRow[] = [];

    for (const u of usersPage.users) {
      const email = (u.email || '').toLowerCase().trim();
      const meta = (u.user_metadata || {}) as Record<string, unknown>;
      const r = typeof meta.role === 'string' ? meta.role : null;
      const t = typeof meta.tier === 'string' ? meta.tier : null;
      const patientId =
        typeof meta.patientId === 'number'
          ? meta.patientId
          : typeof meta.patientId === 'string' && /^\d+$/.test(meta.patientId)
            ? parseInt(meta.patientId, 10)
            : null;
      if (r !== 'patient') continue;
      authByEmail.set(email, { uid: u.id, tier: t, patientId, created_at: u.created_at });
      if (!patientId && !internalEmails.has(email)) {
        const name = (typeof meta.name === 'string' && meta.name) || email.split('@')[0];
        const [first, ...rest] = name.split(' ');
        const tier: 'care' | 'self' | 'free' = t === 'self' || t === 'care' ? t : 'free';
        selfSignups.push({
          id: u.id,
          source: 'self-signup',
          auth_uid: u.id,
          first_name: first || name,
          last_name: rest.join(' ') || '',
          email,
          gender: typeof meta.sex === 'string' ? meta.sex : null,
          city: null,
          country_code: null,
          marketplace_code: null,
          marketplace_name: null,
          lesion_type: null,
          affected_side: null,
          lesion_date: null,
          customer_status: null,
          user_is_active: null,
          business_status: null,
          tier,
          subscription_active: tier !== 'free',
          subscription_plan: tier !== 'free' ? `Self-${tier}` : null,
          therapist_phy_name: null,
          therapist_phy_role: null,
          therapist_lth_name: null,
          therapist_lth_role: null,
          therapist_cns_name: null,
          therapist_cns_role: null,
          therapist_name: null,
          created_at: u.created_at,
        });
      }
    }

    const internalRows: PatientRow[] = result.rows.map((r) => {
      const email = (r.email || '').toLowerCase().trim();
      const auth = authByEmail.get(email);
      const isActive = r.business_status === 'ACTIVO';
      return {
        id: r.id,
        source: 'gestionale' as const,
        auth_uid: auth?.uid ?? null,
        first_name: r.first_name,
        last_name: r.last_name,
        email: r.email,
        gender: r.gender,
        city: r.city,
        country_code: r.country_code,
        marketplace_code: r.marketplace_code,
        marketplace_name: r.marketplace_name,
        lesion_type: r.lesion_type,
        affected_side: r.affected_side,
        lesion_date: r.lesion_date,
        customer_status: r.customer_status,
        user_is_active: r.user_is_active,
        business_status: r.business_status,
        therapist_phy_name: r.therapist_phy_name,
        therapist_phy_role: r.therapist_phy_role,
        therapist_lth_name: r.therapist_lth_name,
        therapist_lth_role: r.therapist_lth_role,
        therapist_cns_name: r.therapist_cns_name,
        therapist_cns_role: r.therapist_cns_role,
        therapist_name: r.therapist_phy_name, // legacy alias
        tier: isActive ? 'care' : null,
        subscription_active: isActive,
        subscription_plan: r.subscription_plan,
        created_at: auth?.created_at ?? null,
      };
    });

    const merged = [...internalRows, ...selfSignups].sort((a, b) => {
      if (a.subscription_active !== b.subscription_active) {
        return a.subscription_active ? -1 : 1;
      }
      return (a.last_name + a.first_name).localeCompare(b.last_name + b.first_name);
    });

    return NextResponse.json({
      rows: merged,
      count: merged.length,
      internalCount: internalRows.length,
      selfSignupCount: selfSignups.length,
      activeOnly,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    console.error('Kinora-admin pazienti API error:', message);
    const status = message.toLowerCase().includes('authoriz') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
