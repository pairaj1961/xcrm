import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, unauthorized } from '@/lib/middleware'

const SYSTEM_PROMPT = `You are an intelligent sales assistant embedded in CRM Pro, a construction-equipment CRM used by a Thai heavy-equipment distributor. Your job is to help sales reps, managers, and product managers work faster and smarter — drafting emails, summarising leads, suggesting next steps, analysing pipeline data, and answering questions about the system.

The company sells, rents, and services heavy construction and industrial equipment (excavators, compactors, power tools, consumables, etc.) across Thailand. Key brands include DeWalt, Atlas Copco, Mikasa, Enerpac, and 3M. Customers are construction companies, industrial factories, and contractors. Deals are tracked in Thai Baht (฿).

User roles: REP (field sales), MANAGER (team lead), PRODUCT_MANAGER (brand specialist), ADMIN (system admin). Tailor responses to the user's role.

Lead statuses: NEW → CONTACTED → SITE_VISIT_SCHEDULED → QUOTE_SENT → NEGOTIATION → CLOSED_WON/CLOSED_LOST/ON_HOLD.
Service lines: SALE, RENTAL, SERVICE.

Be concise and professional. Use ฿ for currency. Default to English, switch to Thai if the user writes in Thai. Do not make up lead IDs, quote numbers, or customer names.`

export async function POST(req: NextRequest) {
  const user = await requireAuth(req)
  if (!user) return unauthorized()

  const { messages } = await req.json()

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Messages required' }, { status: 400 })
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('Anthropic API error:', err)
    return NextResponse.json({ error: 'AI service error' }, { status: 502 })
  }

  const data = await response.json()
  const content = data.content?.[0]?.text ?? 'Sorry, I could not generate a response.'

  return NextResponse.json({ content })
}
