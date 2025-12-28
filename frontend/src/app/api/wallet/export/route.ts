import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const formatType = searchParams.get('format') || 'csv';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query
    let query = supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: transactions, error } = await query;

    if (error) throw error;

    if (formatType === 'csv') {
      // Generate CSV
      const headers = [
        'Date',
        'Type',
        'Description',
        'Amount',
        'Balance Before',
        'Balance After',
        'Status',
        'Receipt #',
        'Notes',
      ];

      const rows = transactions?.map((tx) => [
        format(new Date(tx.created_at), 'yyyy-MM-dd HH:mm:ss'),
        tx.transaction_type,
        tx.description,
        tx.amount_usd,
        tx.balance_before_usd,
        tx.balance_after_usd,
        tx.status,
        tx.receipt_number || '',
        tx.notes || '',
      ]);

      const csv = [
        headers.join(','),
        ...(rows?.map((row) => row.map((cell) => `"${cell}"`).join(',')) || []),
      ].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="wallet-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
  } catch (error: any) {
    console.error('Error exporting transactions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
