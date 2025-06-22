'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
  X
} from 'lucide-react'

interface SidebarProps {
  userRole: 'admin' | 'sales' | 'worker' | 'client'
  onCollapsedChange?: (collapsed: boolean) => void
}

interface NavItem {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  roles: Array<'admin' | 'sales' | 'worker' | 'client'>
}

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
    roles: ['admin', 'sales', 'worker', 'client']
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

export const Sidebar = ({ userRole, onCollapsedChange }: SidebarProps) => {
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

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium sidebar-nav-link',
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
              <span className="text-sm font-medium capitalize">
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
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggleMobile}
        className="lg:hidden fixed top-4 left-4 z-50 h-10 w-10 bg-background/80 backdrop-blur-sm border border-border shadow-lg hover:bg-accent hover:text-accent-foreground"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={handleToggleMobile}
        />
      )}

      {/* Desktop Sidebar */}
      <div className={cn(
        'hidden lg:flex fixed left-0 top-0 z-30 h-full flex-col transition-all duration-300 ease-in-out shadow-xl',
        isCollapsed ? 'w-16' : 'w-64'
      )}>
        {sidebarContent}
      </div>

      {/* Mobile Sidebar */}
      <div className={cn(
        'lg:hidden fixed left-0 top-0 z-50 h-full w-64 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl',
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {sidebarContent}
      </div>
    </>
  )
} 