/**
 * Reusable Data Table Component
 * Provides sorting, filtering, and action capabilities for CRUD operations
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, MoreHorizontal, ChevronUp, ChevronDown } from 'lucide-react'

interface Column<T> {
  key: keyof T | string
  title: string
  sortable?: boolean
  render?: (item: T) => React.ReactNode
  className?: string
}

interface Action<T> {
  label: string
  onClick: (item: T) => void
  variant?: 'default' | 'destructive' | 'outline' | 'secondary'
  icon?: React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  title: string
  description?: string
  data: T[]
  columns: Column<T>[]
  actions?: Action<T>[]
  searchable?: boolean
  searchPlaceholder?: string
  onSearch?: (query: string) => void
  isLoading?: boolean
  emptyState?: {
    title: string
    description: string
    action?: {
      label: string
      onClick: () => void
      icon?: React.ReactNode
    }
  }
  headerActions?: React.ReactNode
}

export function DataTable<T extends Record<string, any>>({
  title,
  description,
  data,
  columns,
  actions = [],
  searchable = true,
  searchPlaceholder = "Search...",
  onSearch,
  isLoading = false,
  emptyState,
  headerActions
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [showActions, setShowActions] = useState<Record<string, boolean>>({})

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    onSearch?.(query)
  }

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(columnKey)
      setSortDirection('asc')
    }
  }

  const toggleActions = (itemId: string) => {
    setShowActions(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  const sortedData = [...data].sort((a, b) => {
    if (!sortColumn) return 0
    
    const aValue = a[sortColumn]
    const bValue = b[sortColumn]
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const filteredData = searchQuery
    ? sortedData.filter(item =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : sortedData

  const renderCellValue = (item: T, column: Column<T>) => {
    if (column.render) {
      return column.render(item)
    }
    
    const value = item[column.key as keyof T]
    
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground">—</span>
    }
    
    return String(value)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {headerActions && (
            <div className="flex items-center space-x-2">
              {headerActions}
            </div>
          )}
        </div>
        
        {searchable && (
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-current border-t-transparent rounded-full" />
          </div>
        ) : filteredData.length > 0 ? (
          <div className="space-y-4">
            {/* Header Row */}
            <div className="grid gap-4 p-4 bg-muted/30 rounded-lg font-medium text-sm" 
                 style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr) ${actions.length > 0 ? 'auto' : ''}` }}>
              {columns.map((column) => (
                <div
                  key={String(column.key)}
                  className={`flex items-center space-x-1 ${column.className || ''}`}
                >
                  <span>{column.title}</span>
                  {column.sortable && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0"
                      onClick={() => handleSort(String(column.key))}
                    >
                      {sortColumn === column.key ? (
                        sortDirection === 'asc' ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )
                      ) : (
                        <ChevronUp className="h-3 w-3 opacity-30" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
              {actions.length > 0 && (
                <div className="w-10"></div>
              )}
            </div>

            {/* Data Rows */}
            {filteredData.map((item, index) => (
              <div
                key={item.id || index}
                className="grid gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr) ${actions.length > 0 ? 'auto' : ''}` }}
              >
                {columns.map((column) => (
                  <div key={String(column.key)} className={column.className || ''}>
                    {renderCellValue(item, column)}
                  </div>
                ))}
                
                {actions.length > 0 && (
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => toggleActions(item.id || index)}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    
                    {showActions[item.id || index] && (
                      <div className="absolute right-0 top-8 z-10 min-w-32 bg-background border border-border rounded-md shadow-lg">
                        {actions.map((action, actionIndex) => (
                          <Button
                            key={actionIndex}
                            variant="ghost"
                            size="sm"
                            className={`w-full justify-start ${action.className || ''}`}
                            onClick={() => {
                              action.onClick(item)
                              setShowActions(prev => ({ ...prev, [item.id || index]: false }))
                            }}
                          >
                            {action.icon && <span className="mr-2">{action.icon}</span>}
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          emptyState && (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-foreground mb-2">
                {emptyState.title}
              </h3>
              <p className="text-muted-foreground mb-4">
                {emptyState.description}
              </p>
              {emptyState.action && (
                <Button onClick={emptyState.action.onClick}>
                  {emptyState.action.icon && (
                    <span className="mr-2">{emptyState.action.icon}</span>
                  )}
                  {emptyState.action.label}
                </Button>
              )}
            </div>
          )
        )}
      </CardContent>
    </Card>
  )
} 