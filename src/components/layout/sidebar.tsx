'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Wrench, 
  Building2, 
  BarChart3, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Bell
} from 'lucide-react'

interface SidebarProps {
  userRole: 'admin' | 'sales' | 'worker' | 'client'
  hasPendingInvitation?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

interface NavItem {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  roles: Array<'admin' | 'sales' | 'worker' | 'client'>
  showNotification?: boolean
}

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
    roles: ['admin', 'sales', 'worker', 'client'],
    showNotification: true // Dashboard can show invitation notifications
  },
  {
    href: '/dashboard/jobs',
    icon: Calendar,
    label: 'Jobs & Schedule',
    roles: ['admin', 'sales', 'worker']
  },
  {
    href: '/dashboard/workers',
    icon: Users,
    label: 'Workers',
    roles: ['admin', 'sales']
  },
  {
    href: '/dashboard/team',
    icon: Users,
    label: 'Team Management',
    roles: ['admin', 'sales']
  },
  {
    href: '/dashboard/crews',
    icon: Wrench,
    label: 'Crews',
    roles: ['admin', 'sales']
  },
  {
    href: '/dashboard/clients',
    icon: Building2,
    label: 'Clients',
    roles: ['admin', 'sales']
  },
  {
    href: '/dashboard/reports',
    icon: BarChart3,
    label: 'Reports',
    roles: ['admin', 'sales']
  },
  {
    href: '/dashboard/settings',
    icon: Settings,
    label: 'Settings',
    roles: ['admin', 'sales', 'worker', 'client']
  }
]

export const Sidebar = ({ userRole, hasPendingInvitation = false, onCollapsedChange }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const pathname = usePathname()

  const filteredNavItems = navItems.filter(item => item.roles.includes(userRole))

  const handleToggleCollapsed = () => {
    const newCollapsed = !isCollapsed
    setIsCollapsed(newCollapsed)
    onCollapsedChange?.(newCollapsed)
  }

  const handleToggleMobile = () => setIsMobileOpen(!isMobileOpen)

  // Notify parent of initial state
  useEffect(() => {
    onCollapsedChange?.(isCollapsed)
  }, [])

  const sidebarContent = (
    <div className="flex h-full flex-col bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center shadow-lg">
              <Wrench className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sidebar-foreground text-sm">DCS</span>
              <span className="text-xs text-sidebar-foreground/60">Crew Scheduler</span>
            </div>
          </div>
        )}
        
        {/* Notification indicator in header */}
        {hasPendingInvitation && (
          <div className="flex items-center">
            {!isCollapsed && (
              <div className="flex items-center space-x-2 mr-2">
                <Bell className="h-4 w-4 text-orange-500 animate-pulse" />
                <span className="text-xs text-orange-600 font-medium">Invitation</span>
              </div>
            )}
            {isCollapsed && (
              <div className="relative mr-2">
                <Bell className="h-4 w-4 text-orange-500 animate-pulse" />
                <div className="absolute -top-1 -right-1 h-2 w-2 bg-orange-500 rounded-full"></div>
              </div>
            )}
          </div>
        )}
        
        {/* Desktop collapse button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleCollapsed}
          className="hidden lg:flex h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>

        {/* Mobile close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleMobile}
          className="lg:hidden h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {filteredNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || 
                          (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const showNotificationBadge = item.showNotification && hasPendingInvitation

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium sidebar-nav-link relative',
                'hover:shadow-sm',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md border border-sidebar-primary/20'
                  : 'text-sidebar-foreground',
                isCollapsed && 'justify-center space-x-0 px-2'
              )}
            >
              <Icon className={cn('h-5 w-5 flex-shrink-0', isCollapsed && 'h-5 w-5')} />
              {!isCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
              {!isCollapsed && showNotificationBadge && (
                <Badge variant="destructive" className="ml-auto h-5 w-5 p-0 flex items-center justify-center text-xs bg-orange-500 hover:bg-orange-600">
                  !
                </Badge>
              )}
              {isCollapsed && showNotificationBadge && (
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-orange-500 rounded-full border border-white"></div>
              )}
              {isCollapsed && (
                <span className="sr-only">{item.label}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        <div className={cn(
          'flex items-center space-x-2 text-xs text-sidebar-foreground/70',
          isCollapsed && 'justify-center space-x-0'
        )}>
          {!isCollapsed ? (
            <>
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground">
                <span className="text-xs font-medium capitalize">
                  {userRole.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="capitalize font-medium text-sidebar-foreground">{userRole}</span>
                <span className="text-xs text-sidebar-foreground/60">Role</span>
              </div>
            </>
          ) : (
            <div 
              className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground"
              title={`${userRole} role`}
            >
              <span className="text-xs font-medium capitalize">
                {userRole.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={handleToggleMobile}
        />
      )}
      
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggleMobile}
        className="fixed top-4 left-4 z-50 lg:hidden h-10 w-10 bg-background border shadow-md hover:bg-accent"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden lg:block fixed left-0 top-0 z-30 h-screen transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-16' : 'w-64'
      )}>
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <aside className={cn(
        'fixed left-0 top-0 z-50 h-screen w-64 transform transition-transform duration-300 ease-in-out lg:hidden',
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {sidebarContent}
      </aside>
    </>
  )
} 