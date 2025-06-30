'use client'

import React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Step {
  id: string
  title: string
  description?: string
  isComplete?: boolean
  isActive?: boolean
  isError?: boolean
}

interface StepperProps {
  steps: Step[]
  currentStep: number
  className?: string
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <div className={cn("w-full", className)}>
      <nav aria-label="Progress">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-200 shadow-sm",
              steps[currentStep] && (
                currentStep === steps.length - 1 ? "border-green-600 bg-green-600 text-white shadow-green-200" : "border-primary bg-primary text-white shadow-primary/20"
              )
            )}>
              {currentStep === steps.length - 1 ? (
                <Check className="h-4 w-4" />
              ) : (
                <span className="text-xs font-medium">{currentStep + 1}</span>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-primary">
                {steps[currentStep]?.title}
              </p>
              {steps[currentStep]?.description && (
                <p className="text-xs text-muted-foreground">
                  {steps[currentStep].description}
                </p>
              )}
            </div>
          </div>
          <span className="text-sm text-muted-foreground font-medium">
            {currentStep + 1} of {steps.length}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 shadow-inner">
          <div 
            className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-300 shadow-sm"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </nav>
    </div>
  )
}