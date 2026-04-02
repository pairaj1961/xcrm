import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, unauthorized, forbidden, notFound } from '@/lib/middleware'
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { createElement } from 'react'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#111111' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  logo: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: '#d97706' },
  quoteInfo: { alignItems: 'flex-end' },
  quoteNumber: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 6, color: '#374151' },
  row: { flexDirection: 'row', paddingVertical: 6, borderBottom: '1px solid #e5e7eb' },
  tableHeader: { flexDirection: 'row', paddingVertical: 6, borderBottom: '2px solid #111111', fontFamily: 'Helvetica-Bold' },
  col1: { flex: 4 },
  col2: { flex: 1, textAlign: 'center' },
  col3: { flex: 1.5, textAlign: 'right' },
  col4: { flex: 1, textAlign: 'center' },
  col5: { flex: 1.5, textAlign: 'right' },
  totalsRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 4 },
  totalsLabel: { width: 120, textAlign: 'right', marginRight: 16, color: '#6b7280' },
  totalsValue: { width: 80, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8, marginTop: 4, borderTop: '2px solid #111111' },
  totalLabel: { width: 120, textAlign: 'right', marginRight: 16, fontFamily: 'Helvetica-Bold', fontSize: 12 },
  totalValue: { width: 80, textAlign: 'right', fontFamily: 'Helvetica-Bold', fontSize: 12, color: '#d97706' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', color: '#9ca3af', fontSize: 8 },
})

function fmt(n: number) {
  return `฿${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()
  const { id } = await params

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      lineItems: { include: { product: { select: { modelName: true } } } },
      lead: {
        select: {
          title: true,
          assignedToId: true,
          customer: { select: { companyName: true, billingAddress: true } },
        },
      },
    },
  })
  if (!quote) return notFound('Quote not found')
  if (user.role === 'REP' && quote.lead.assignedToId !== user.id) return forbidden()

  const settings = await prisma.settings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {},
  })

  const doc = createElement(Document, {},
    createElement(Page, { size: 'A4', style: styles.page },
      // Header
      createElement(View, { style: styles.header },
        createElement(View, {},
          createElement(Text, { style: styles.logo }, 'xCRM'),
          createElement(Text, { style: { color: '#6b7280', marginTop: 4 } }, settings.companyName),
        ),
        createElement(View, { style: styles.quoteInfo },
          createElement(Text, { style: styles.quoteNumber }, quote.quoteNumber),
          createElement(Text, { style: { color: '#6b7280' } }, `Date: ${new Date(quote.createdAt).toLocaleDateString('en-GB')}`),
          quote.validUntil && createElement(Text, { style: { color: '#6b7280' } }, `Valid until: ${new Date(quote.validUntil).toLocaleDateString('en-GB')}`),
        ),
      ),
      // Bill to
      createElement(View, { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, 'Bill To'),
        createElement(Text, {}, quote.lead.customer.companyName),
        quote.lead.customer.billingAddress && createElement(Text, { style: { color: '#6b7280' } }, quote.lead.customer.billingAddress),
      ),
      // Line items table
      createElement(View, { style: styles.section },
        createElement(View, { style: styles.tableHeader },
          createElement(Text, { style: styles.col1 }, 'Description'),
          createElement(Text, { style: styles.col2 }, 'Qty'),
          createElement(Text, { style: styles.col3 }, 'Unit Price'),
          createElement(Text, { style: styles.col4 }, 'Disc %'),
          createElement(Text, { style: styles.col5 }, 'Subtotal'),
        ),
        ...quote.lineItems.map((item) =>
          createElement(View, { key: item.id, style: styles.row },
            createElement(Text, { style: styles.col1 }, item.description),
            createElement(Text, { style: styles.col2 }, String(item.qty)),
            createElement(Text, { style: styles.col3 }, fmt(item.unitPrice)),
            createElement(Text, { style: styles.col4 }, item.discount > 0 ? `${item.discount}%` : '—'),
            createElement(Text, { style: styles.col5 }, fmt(item.subtotal)),
          )
        ),
      ),
      // Totals
      createElement(View, {},
        createElement(View, { style: styles.totalsRow },
          createElement(Text, { style: styles.totalsLabel }, 'Subtotal'),
          createElement(Text, { style: styles.totalsValue }, fmt(quote.subtotal)),
        ),
        quote.discount > 0 && createElement(View, { style: styles.totalsRow },
          createElement(Text, { style: styles.totalsLabel }, 'Discount'),
          createElement(Text, { style: styles.totalsValue }, `-${fmt(quote.discount)}`),
        ),
        createElement(View, { style: styles.totalsRow },
          createElement(Text, { style: styles.totalsLabel }, `Tax (${quote.taxRate}%)`),
          createElement(Text, { style: styles.totalsValue }, fmt(quote.taxAmount)),
        ),
        createElement(View, { style: styles.totalRow },
          createElement(Text, { style: styles.totalLabel }, 'TOTAL'),
          createElement(Text, { style: styles.totalValue }, fmt(quote.total)),
        ),
      ),
      // Notes
      quote.notes && createElement(View, { style: { marginTop: 24 } },
        createElement(Text, { style: styles.sectionTitle }, 'Notes'),
        createElement(Text, { style: { color: '#6b7280' } }, quote.notes),
      ),
      // Footer
      createElement(Text, { style: styles.footer }, `${settings.companyName} · Generated by xCRM`),
    )
  )

  const buffer = await renderToBuffer(doc)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${quote.quoteNumber}.pdf"`,
    },
  })
}
