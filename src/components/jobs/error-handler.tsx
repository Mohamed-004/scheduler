'use client'

import React from 'react'
import { SimpleAlert, type AlertItem } from '@/components/ui/simple-alert'

interface ValidationError {
  message: string
  field?: string
  code?: string
}

interface ValidationResult {
  errors: ValidationError[]
  warnings: ValidationError[]
  suggestions?: string[]
}

interface ErrorHandlerProps {
  validationResult: ValidationResult | null
  isValidating: boolean
  onRefresh?: () => void
  onDismiss?: () => void
  className?: string
}

export function ErrorHandler({ 
  validationResult, 
  isValidating, 
  onRefresh, 
  onDismiss,
  className = '' 
}: ErrorHandlerProps) {
  if (!validationResult || isValidating) {
    return null
  }

  const { errors, warnings } = validationResult
  const hasErrors = errors.length > 0
  const hasWarnings = warnings.length > 0

  if (!hasErrors && !hasWarnings) {
    return null
  }

  // Convert validation errors to alert items
  const createAlertItems = (validationErrors: ValidationError[], type: 'error' | 'warning'): AlertItem[] => {
    return validationErrors.map((error, index) => ({
      id: `${type}-${index}`,
      title: getErrorTitle(error),
      message: error.message,
      suggestions: getErrorSuggestions(error),
      action: getErrorAction(error)
    }))
  }

  const getErrorTitle = (error: ValidationError): string => {
    if (error.field) {
      switch (error.field) {
        case 'availability':
          return 'Worker Availability Issue'
        case 'roles':
          return 'Role Assignment Problem'
        case 'schedule':
          return 'Scheduling Conflict'
        case 'client':
          return 'Client Information Issue'
        default:
          return 'Validation Error'
      }
    }
    
    // Infer from message content
    if (error.message.toLowerCase().includes('availability')) {
      return 'Worker Availability Issue'
    }
    if (error.message.toLowerCase().includes('role')) {
      return 'Role Assignment Problem'
    }
    if (error.message.toLowerCase().includes('schedule') || error.message.toLowerCase().includes('time')) {
      return 'Scheduling Conflict'
    }
    if (error.message.toLowerCase().includes('client')) {
      return 'Client Information Issue'
    }
    
    return 'Validation Error'
  }

  const getErrorSuggestions = (error: ValidationError): string[] => {
    const suggestions: string[] = []
    
    if (error.message.toLowerCase().includes('availability')) {
      suggestions.push('Try selecting a different date or time')
      suggestions.push('Consider assigning fewer workers')
      suggestions.push('Check worker schedules in the team section')
    } else if (error.message.toLowerCase().includes('role')) {
      suggestions.push('Create the required job roles first')
      suggestions.push('Assign workers to the needed roles')
      suggestions.push('Adjust the role requirements for this job')
    } else if (error.message.toLowerCase().includes('schedule')) {
      suggestions.push('Choose a different time slot')
      suggestions.push('Check for conflicting appointments')
      suggestions.push('Consider splitting into multiple jobs')
    } else if (error.message.toLowerCase().includes('client')) {
      suggestions.push('Create a new client profile first')
      suggestions.push('Check client contact information')
    } else {
      suggestions.push('Review the form details above')
      suggestions.push('Contact support if the issue persists')
    }
    
    return suggestions
  }

  const getErrorAction = (error: ValidationError) => {
    if (error.message.toLowerCase().includes('role')) {
      return {
        label: 'Create Roles',
        onClick: () => window.open('/dashboard/roles', '_blank')
      }
    }
    if (error.message.toLowerCase().includes('client')) {
      return {
        label: 'Add Client',
        onClick: () => window.open('/dashboard/clients/new', '_blank')
      }
    }
    if (error.message.toLowerCase().includes('worker')) {
      return {
        label: 'View Workers',
        onClick: () => window.open('/dashboard/workers', '_blank')
      }
    }
    return undefined
  }

  // Show errors first, then warnings
  if (hasErrors) {
    const alertItems = createAlertItems(errors, 'error')
    
    return (
      <SimpleAlert
        type="error"
        title="Unable to Create Job"
        description="Please resolve these issues before creating the job."
        items={alertItems}
        onRefresh={onRefresh}
        onDismiss={onDismiss}
        className={className}
      />
    )
  }

  if (hasWarnings) {
    const alertItems = createAlertItems(warnings, 'warning')
    
    return (
      <SimpleAlert
        type="warning"
        title="Scheduling Recommendations"
        description="These suggestions can help optimize your job scheduling."
        items={alertItems}
        onRefresh={onRefresh}
        onDismiss={onDismiss}
        className={className}
      />
    )
  }

  return null
}