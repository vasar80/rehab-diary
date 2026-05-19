import { NextRequest, NextResponse } from 'next/server';
import { verifyCallerFromAuthHeader, createSupabaseAdminClient } from '@/lib/supabase/server';
import { isStaffEmail, isStaffMetadataRole } from '../../_lib/staff-gate';
import { Client } from 'pg';

interface PatientRow {
  // For internal patients, the Resilients id. For self-signup, the
  // Supabase auth.users.id (UUID).
  id: number | string;
  source: 'gestionale' | 'self-signup';
  // Linked auth uid (always present for self-signup; for internal it's
  // present iff the staff has run "Crea login" for that patient).
  auth_uid: string | null;
  first_name: string;
  last_name: string;
  email: string;
  gender: string | null;
  city: string | null;
  country_code: string | null;
  lesion_type: string | null;
  affected_side: string | null;
  lesion_date: string | null;
  therapist_name: string | null;
  // From Resilients (paid plan) or self-signup tier ('free' / 'self').
  tier: 'care' | 'self' | 'free' | null;
  subscription_active: boolean;
  subscription_plan: string | null;
  // ISO timestamp of when the self-signup or internal-login was created
  created_at: string | null;
}

let cachedClient: Client | null = null;
async function strDbClient(): Promise<Client> {
  if (cachedClient) return cachedClient;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL non configurata su questo environment');
  }
  // Quick sanity-check on the env var shape — gives us useful diagnostics
  // in Vercel logs when the value is a placeholder or the legacy
  // `.rds.amazonaws.com:`-suffixed version, without ever revealing the
  // password.
  const looksValid =
    url.startsWith('postgresql://') &&
    url.includes('@') &&
    !url.includes('METTI_') &&
    !url.includes('INCOLLA_') &&
    !url.includes('.rds.amazonaws.com:');
  if (!looksValid) {
    const prefix = url.slice(0, 13); // "postgresql://"
    const after = url.substring(13);
    const atIdx = after.indexOf('@');
    const hostPart = atIdx >= 0 ? after.substring(atIdx + 1) : after;
    throw new Error(
      `DATABASE_URL malformata. prefisso="${prefix}" lunghezza=${url.length} host="${hostPart.slice(0, 60)}"`
    );
  }
  const c = new Client({
    connectionString: url.replace('?sslmode=require', ''),
    ssl: false, // Resilients RDS doesn't accept SSL on public endpoint
    connectionTimeoutMillis: 8000,
  });
  await c.connect();
  cachedClient = c;
  return c;
}

export async function GET(request: NextRequest) {
  try {
    const caller = await verifyCallerFromAuthHeader(
      request.headers.get('authorization')
    );
    const adminAuth = createSupabaseAdminClient();
    const { data: callerUser } = await adminAuth.auth.admin.getUserById(caller.uid);
    const role = (callerUser?.user?.user_metadata as Record<string, unknown> | null)?.role;
    if (!isStaffEmail(caller.email) && !isStaffMetadataRole(role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const url = new URL(request.url);
    const search = (url.searchParams.get('q') || '').trim();
    const activeOnly = url.searchParams.get('activeOnly') !== 'false';
    const market = (url.searchParams.get('market') || 'all').toLowerCase(); // all|it|es|other
    const limit = Math.min(2000, parseInt(url.searchParams.get('limit') || '1000', 10));

    const c = await strDbClient();

    // Pull patients with their latest subscription status and assigned
    // therapist's display name. Active = there exists a subscription
    // history row whose end_date is in the future (or NULL = open-ended).
    // IMPORTANT: "active" = has the LATEST PAID subscription (NOT CUS_FRE)
    // and that subscription is open-ended OR ends in the future.
    // CUS_FRE is a sticky default record auto-created when the patient
    // signs up in the gestionale (end_date NULL forever), so it
    // cannot be used as an activity signal — every patient has one.
    const query = `
      WITH latest_paid AS (
        SELECT DISTINCT ON (customer_id)
          customer_id,
          plan,
          end_date,
          start_date
        FROM user_subscriptionhistory
        WHERE plan != 'CUS_FRE'
        ORDER BY customer_id, start_date DESC NULLS LAST
      ),
      assigned AS (
        SELECT DISTINCT ON (patient_id)
          patient_id,
          therapist_id
        FROM assignment_assignedtherapist
        ORDER BY patient_id, modified_at DESC NULLS LAST
      )
      SELECT
        p.id,
        p.first_name,
        p.last_name,
        p.email,
        p.gender,
        p.city,
        cc.code AS country_code,
        p.lesion_type,
        p.affected_side,
        p.lesion_date::text AS lesion_date,
        COALESCE(
          tu.first_name || ' ' || tu.last_name,
          NULL
        ) AS therapist_name,
        lp.plan AS subscription_plan,
        (lp.end_date IS NULL OR lp.end_date > NOW()) AS subscription_active
      FROM user_patient p
      LEFT JOIN user_country cc ON cc.id = p.country_id
      LEFT JOIN latest_paid lp ON lp.customer_id = p.customer_id
      LEFT JOIN assigned a ON a.patient_id = p.id
      LEFT JOIN user_user tu ON tu.id = a.therapist_id
      WHERE ($1::text = '' OR
             p.first_name ILIKE $2 OR
             p.last_name ILIKE $2 OR
             p.email ILIKE $2)
        AND (
          $3::boolean = false
          OR (
            lp.customer_id IS NOT NULL
            AND (lp.end_date IS NULL OR lp.end_date > NOW())
          )
        )
        AND (
          $5::text = 'all'
          OR ($5::text = 'it' AND cc.code = 'IT')
          OR ($5::text = 'es' AND cc.code IN (
            'ES','MX','AR','CL','CO','PE','VE','EC','BO','UY','PA','HN',
            'GT','NI','CR','DO','CU','PR','SV','PY'
          ))
          OR ($5::text = 'other' AND (
            cc.code IS NULL OR cc.code NOT IN (
              'IT','ES','MX','AR','CL','CO','PE','VE','EC','BO','UY','PA',
              'HN','GT','NI','CR','DO','CU','PR','SV','PY'
            )
          ))
        )
      ORDER BY p.last_name ASC NULLS LAST, p.first_name ASC NULLS LAST
      LIMIT $4
    `;
    const result = await c.query<Omit<PatientRow, 'source' | 'auth_uid' | 'tier' | 'created_at'>>(
      query,
      [search, `%${search}%`, activeOnly, limit, market]
    );

    // Map of email → auth.users uid for internal patients that already have
    // been provisioned (Crea login). Self-signup auth users (no patientId,
    // role=patient) are surfaced as a SEPARATE bucket of rows below.
    const internalEmails = new Set(
      result.rows.map((r) => (r.email || '').toLowerCase().trim()).filter(Boolean)
    );

    const supaAdmin = createSupabaseAdminClient();
    const { data: usersPage, error: usersErr } = await supaAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (usersErr) throw usersErr;

    const authByEmail = new Map<
      string,
      { uid: string; tier: string | null; patientId: number | null; created_at: string }
    >();
    const selfSignups: PatientRow[] = [];

    for (const u of usersPage.users) {
      const email = (u.email || '').toLowerCase().trim();
      const meta = (u.user_metadata || {}) as Record<string, unknown>;
      const role = typeof meta.role === 'string' ? meta.role : null;
      const tier = typeof meta.tier === 'string' ? meta.tier : null;
      const patientId =
        typeof meta.patientId === 'number'
          ? meta.patientId
          : typeof meta.patientId === 'string' && /^\d+$/.test(meta.patientId)
            ? parseInt(meta.patientId, 10)
            : null;

      if (role !== 'patient') continue;
      authByEmail.set(email, { uid: u.id, tier, patientId, created_at: u.created_at });

      // Self-signup = role=patient AND no patientId AND not also present in
      // the Resilients list under the same email.
      if (!patientId && !internalEmails.has(email)) {
        const name = (typeof meta.name === 'string' && meta.name) || email.split('@')[0];
        const [first, ...rest] = name.split(' ');
        selfSignups.push({
          id: u.id,
          source: 'self-signup',
          auth_uid: u.id,
          first_name: first || name,
          last_name: rest.join(' ') || '',
          email,
          gender: (typeof meta.sex === 'string' ? meta.sex : null) ?? null,
          city: null,
          country_code: null,
          lesion_type: null,
          affected_side: null,
          lesion_date: null,
          therapist_name: null,
          tier: (tier === 'free' || tier === 'self' || tier === 'care' ? tier : 'free'),
          subscription_active: tier !== null && tier !== 'free' ? true : false,
          subscription_plan: tier ? `Self-${tier}` : null,
          created_at: u.created_at,
        });
      }
    }

    const internalRows: PatientRow[] = result.rows.map((r) => {
      const email = (r.email || '').toLowerCase().trim();
      const auth = authByEmail.get(email);
      return {
        ...r,
        source: 'gestionale' as const,
        auth_uid: auth?.uid ?? null,
        // Internal patient tier is derived from their Resilients plan:
        // any non-CUS_FRE active plan = 'care'.
        tier: r.subscription_active ? 'care' : null,
        created_at: auth?.created_at ?? null,
      };
    });

    // Merge & sort: active first, then alphabetical by name.
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
