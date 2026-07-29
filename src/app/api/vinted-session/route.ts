import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { encrypt } from '@/lib/crypto';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = createAdminClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json();
  if (!Array.isArray(body.cookies) || body.cookies.length === 0) {
    return NextResponse.json({ error: 'cookies array is required' }, { status: 400 });
  }

  const encrypted = encrypt(JSON.stringify(body.cookies), user.id);

  const { error } = await supabase
    .from('vinted_session')
    .upsert(
      { user_id: user.id, cookies_encrypted: encrypted, last_sync_status: 'never_synced' },
      { onConflict: 'user_id' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
