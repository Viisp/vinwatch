import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { encrypt } from '@/lib/crypto';

async function authenticate(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;

  const supabase = createAdminClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return { supabase, user };
}

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { supabase, user } = auth;

  const body = await request.json();
  if (!Array.isArray(body.cookies) || body.cookies.length === 0) {
    return NextResponse.json({ error: 'cookies array is required' }, { status: 400 });
  }

  const encrypted = encrypt(JSON.stringify(body.cookies), user.id);

  // sessionId present -> re-pasting fresher cookies for an existing linked
  // Vinted account. Absent -> linking an additional account (e.g. a
  // separate "achats" account alongside the main "ventes" one).
  if (body.sessionId) {
    const { error } = await supabase
      .from('vinted_session')
      .update({ cookies_encrypted: encrypted, last_sync_status: 'never_synced' })
      .eq('id', body.sessionId)
      .eq('user_id', user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase.from('vinted_session').insert({
    user_id: user.id,
    cookies_encrypted: encrypted,
    last_sync_status: 'never_synced',
    label: typeof body.label === 'string' && body.label.trim() ? body.label.trim() : 'Compte Vinted',
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { supabase, user } = auth;

  const body = await request.json();
  if (!body.sessionId || typeof body.label !== 'string' || !body.label.trim()) {
    return NextResponse.json({ error: 'sessionId and a non-empty label are required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('vinted_session')
    .update({ label: body.label.trim() })
    .eq('id', body.sessionId)
    .eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { supabase, user } = auth;

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  if (!sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });

  const { error } = await supabase.from('vinted_session').delete().eq('id', sessionId).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
