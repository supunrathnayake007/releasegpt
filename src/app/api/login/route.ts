import { NextResponse } from 'next/server'
import users from '@/data/users.json'

export async function POST(req: Request) {
  const { email, password } = await req.json()

  const user = users.find(u => u.email === email && u.password === password)

  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Save user session in cookies (you can also use localStorage on client)
  return NextResponse.json({ message: 'Login successful', user })
}
