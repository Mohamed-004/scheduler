/**
 * Confirmation Dialog Component
 * Provides safe confirmation for destructive actions
 */

'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'destructive' | 'warning' | 'default'
  isLoading?: boolean
}

export const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'destructive',
  isLoading = false
}: ConfirmationDialogProps) => {
  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm()
  }

  const getVariantStyles = () => {
    switch (variant) {
      case 'destructive':
        return {
          icon: <AlertTriangle className="h-6 w-6 text-destructive" />,
          buttonVariant: 'destructive' as const
        }
      case 'warning':
        return {
          icon: <AlertTriangle className="h-6 w-6 text-warning" />,
          buttonVariant: 'default' as const
        }
      default:
        return {
          icon: <AlertTriangle className="h-6 w-6 text-primary" />,
          buttonVariant: 'default' as const
        }
    }
  }

  const { icon, buttonVariant } = getVariantStyles()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <Card className="relative w-full max-w-md mx-4 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {icon}
              <div>
                <CardTitle className="text-lg">{title}</CardTitle>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onClose}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="text-base">
            {description}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="flex items-center justify-end space-x-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            <Button
              variant={buttonVariant}
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                  Processing...
                </>
              ) : (
                confirmText
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Hook for managing confirmation dialog state
export const useConfirmationDialog = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<{
    title: string
    description: string
    onConfirm: () => void
    confirmText?: string
    cancelText?: string
    variant?: 'destructive' | 'warning' | 'default'
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const openDialog = (dialogConfig: typeof config) => {
    setConfig(dialogConfig)
    setIsOpen(true)
  }

  const closeDialog = () => {
    setIsOpen(false)
    setIsLoading(false)
    setConfig(null)
  }

  const handleConfirm = async () => {
    if (!config) return
    
    setIsLoading(true)
    try {
      await config.onConfirm()
      closeDialog()
    } catch (error) {
      setIsLoading(false)
      // Keep dialog open on error
    }
  }

  const DialogComponent = config ? (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={closeDialog}
      onConfirm={handleConfirm}
      title={config.title}
      description={config.description}
      confirmText={config.confirmText}
      cancelText={config.cancelText}
      variant={config.variant}
      isLoading={isLoading}
    />
  ) : null

  return {
    openDialog,
    closeDialog,
    DialogComponent,
    isOpen,
    isLoading
  }
} 