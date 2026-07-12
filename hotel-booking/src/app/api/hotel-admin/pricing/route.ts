export async function GET() {
  return new Response(JSON.stringify({ success: false, message: 'Not implemented' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' },
  })
}
