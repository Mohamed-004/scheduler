'use client'

import React, { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronRight, X, RefreshCw } from 'lucide-react'
import { Button } from './button'

export interface AlertItem {
  id: string
  title: string
  message: string
  suggestions?: string[]
  action?: {
    label: string
    onClick: () => void
  }
}

interface SimpleAlertProps {
  type: 'error' | 'warning' | 'info'
  title: string
  description?: string
  items: AlertItem[]
  onDismiss?: () => void
  onRefresh?: () => void
  className?: string
}

export function SimpleAlert({ 
  type, 
  title, 
  description, 
  items, 
  onDismiss, 
  onRefresh,
  className = '' 
}: SimpleAlertProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  
  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  const getTypeStyles = () => {
    switch (type) {
      case 'error':
        return {
          border: 'border-red-200',
          background: 'bg-red-50/50',
          icon: 'text-red-600',
          title: 'text-red-900',
          description: 'text-red-700',
          itemBorder: 'border-red-100'
        }
      case 'warning':
        return {
          border: 'border-orange-200',
          background: 'bg-orange-50/50',
          icon: 'text-orange-600',
          title: 'text-orange-900',
          description: 'text-orange-700',
          itemBorder: 'border-orange-100'
        }
      default:
        return {
          border: 'border-blue-200',
          background: 'bg-blue-50/50',
          icon: 'text-blue-600',
          title: 'text-blue-900',
          description: 'text-blue-700',
          itemBorder: 'border-blue-100'
        }
    }
  }

  const styles = getTypeStyles()

  return (
    <div className={`rounded-lg border ${styles.border} ${styles.background} ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-3">
        <div className="flex items-start space-x-3">
          <AlertTriangle className={`h-5 w-5 mt-0.5 ${styles.icon}`} />
          <div className="min-w-0 flex-1">
            <h3 className={`font-medium ${styles.title}`}>{title}</h3>
            {description && (
              <p className={`text-sm mt-1 ${styles.description}`}>{description}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {items.length} {items.length === 1 ? 'issue' : 'issues'} found
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          {onRefresh && (
            <Button variant="ghost" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Issues List */}
      <div className="px-4 pb-4">
        <div className="space-y-2">
          {items.map((item, index) => {
            const isExpanded = expandedItems.has(item.id)
            const hasSuggestions = item.suggestions && item.suggestions.length > 0
            
            return (
              <div key={item.id} className={`border rounded-md ${styles.itemBorder} bg-white`}>
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-medium flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-foreground text-sm">{item.title}</h4>
                      <p className="text-sm text-muted-foreground mt-0.5">{item.message}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-3">
                    {item.action && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={item.action.onClick}
                        className="text-xs"
                      >
                        {item.action.label}
                      </Button>
                    )}
                    {hasSuggestions && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(item.id)}
                        className="p-1 h-6 w-6"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Expanded Content */}
                {isExpanded && hasSuggestions && (
                  <div className="px-3 pb-3 pt-0">
                    <div className="border-t pt-3">
                      <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Suggestions
                      </h5>
                      <ul className="space-y-1">
                        {item.suggestions?.map((suggestion, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground flex items-start space-x-2">
                            <span className="text-primary mt-1.5 block w-1 h-1 rounded-full bg-current flex-shrink-0" />
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}