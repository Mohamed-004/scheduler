'use client'

import { Button } from '@/components/ui/button'
import { signOut } from '@/app/auth/actions'

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button variant="outline" size="sm" type="submit">
        Sign Out
      </Button>
    </form>
  )
} 