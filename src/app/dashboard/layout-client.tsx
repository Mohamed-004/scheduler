'use client'

import { ReactNode, useState } from 'react'
import { Button } from '@/components/ui/button'
import { SignOutButton } from '@/components/sign-out-button'
import { Sidebar } from '@/components/layout/sidebar'
import { cn } from '@/lib/utils'

interface DashboardLayoutClientProps {
  children: ReactNode
  userProfile: any
  userEmail: string
  hasPendingInvitation: boolean
}

export const DashboardLayoutClient = ({ 
  children, 
  userProfile, 
  userEmail,
  hasPendingInvitation
}: DashboardLayoutClientProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const handleSidebarCollapse = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar 
        userRole={userProfile?.role || 'worker'} 
        hasPendingInvitation={hasPendingInvitation}
        onCollapsedChange={handleSidebarCollapse}
      />
      
      {/* Main Content */}
      <div className={cn(
        "flex flex-col min-h-screen transition-all duration-300 ease-in-out",
        // Desktop responsive margins
        "lg:ml-64", // Default sidebar width
        sidebarCollapsed && "lg:ml-16" // Collapsed sidebar width
      )}>
        {/* Top Navigation */}
        <nav className="bg-card border-b border-border shadow-sm sticky top-0 z-20 backdrop-blur-sm bg-card/80">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              {/* Left side - Title (visible on mobile, adaptive on desktop) */}
              <div className="flex items-center">
                <h1 className={cn(
                  "text-xl font-semibold text-foreground transition-all duration-300",
                  "ml-16 lg:ml-0", // Mobile menu button offset, none on desktop
                  sidebarCollapsed ? "lg:ml-4" : "lg:ml-0"
                )}>
                  <span className="lg:hidden">DCS</span>
                  <span className="hidden lg:inline">
                    {sidebarCollapsed ? "DCS" : "Dynamic Crew Scheduler"}
                  </span>
                </h1>
              </div>
              
              {/* Right side - User info and actions */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-medium text-foreground">
                      {userEmail}
                    </div>
                    {userProfile?.role && (
                      <div className="text-xs text-muted-foreground capitalize">
                        {userProfile.role}
                      </div>
                    )}
                  </div>
                  {userProfile?.role && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-sm">
                      {userProfile.role.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <SignOutButton />
              </div>
            </div>
          </div>
        </nav>
        
        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
} 