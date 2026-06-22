// lib/admin-auth.ts
import { NextRequest, NextResponse } from 'next/server';

export async function requireAdmin(
  req: NextRequest
): Promise<NextResponse | null> {
  const token = req.headers.get('authorization');

  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // verify token/session
//   const user = await verifyUser(token);

//   if (!user?.isAdmin) {
//     return NextResponse.json(
//       { error: 'Forbidden' },
//       { status: 403 }
//     );
//   }

  return null;
}