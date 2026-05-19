import { NextRequest, NextResponse } from 'next/server';
import { verifyCallerFromAuthHeader, createSupabaseAdminClient } from '@/lib/supabase/server';
import { isStaffEmail, isStaffMetadataRole } from '../../_lib/staff-gate';
import { Client } from 'pg';

interface PatientRow {
  id: number;
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
  // Derived from latest user_subscriptionhistory record
  subscription_active: boolean;
  subscription_plan: string | null;
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
    const query = `
      WITH latest_sub AS (
        SELECT DISTINCT ON (customer_id)
          customer_id,
          plan,
          end_date,
          start_date
        FROM user_subscriptionhistory
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
        ls.plan AS subscription_plan,
        (ls.end_date IS NULL OR ls.end_date > NOW()) AS subscription_active
      FROM user_patient p
      LEFT JOIN user_country cc ON cc.id = p.country_id
      LEFT JOIN latest_sub ls ON ls.customer_id = p.customer_id
      LEFT JOIN assigned a ON a.patient_id = p.id
      LEFT JOIN user_user tu ON tu.id = a.therapist_id
      WHERE ($1::text = '' OR
             p.first_name ILIKE $2 OR
             p.last_name ILIKE $2 OR
             p.email ILIKE $2)
        AND ($3::boolean = false OR (ls.end_date IS NULL OR ls.end_date > NOW()))
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
    const result = await c.query<PatientRow>(query, [
      search,
      `%${search}%`,
      activeOnly,
      limit,
      market,
    ]);

    return NextResponse.json({
      rows: result.rows,
      count: result.rows.length,
      activeOnly,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    console.error('Kinora-admin pazienti API error:', message);
    const status = message.toLowerCase().includes('authoriz') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
