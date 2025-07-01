'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Filter,
  Users, 
  UserCheck, 
  Calendar, 
  Briefcase,
  Settings,
  AlertTriangle,
  CheckCircle,
  Info,
  ArrowRight,
  Star,
  Zap,
  Target
} from 'lucide-react'

interface FAQContentProps {
  userRole: 'admin' | 'sales' | 'worker' | 'client'
}

interface FAQItem {
  id: string
  question: string
  answer: string | React.ReactNode
  category: string
  roles: string[]
  priority: 'high' | 'medium' | 'low'
  keywords: string[]
}

const faqData: FAQItem[] = [
  // Getting Started
  {
    id: 'overview',
    question: 'What is Dynamic Crew Scheduler and how does it work?',
    answer: (
      <div className="space-y-4">
        <p>Dynamic Crew Scheduler is a comprehensive workforce management system designed for service-based businesses. It ensures that every job has qualified, available workers before creation.</p>
        
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">Key Features:</h4>
          <ul className="list-disc list-inside space-y-1 text-blue-800">
            <li>Role-based job assignments</li>
            <li>Worker availability tracking</li>
            <li>Strict validation to prevent scheduling conflicts</li>
            <li>Intelligent job creation wizard</li>
            <li>Real-time worker-role matching</li>
          </ul>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-900 mb-2">Workflow Overview:</h4>
          <ol className="list-decimal list-inside space-y-1 text-green-800">
            <li>Create job roles (Window Cleaner, Landscaper, etc.)</li>
            <li>Add workers to your team</li>
            <li>Assign workers to specific roles</li>
            <li>Set worker availability schedules</li>
            <li>Create jobs with role requirements</li>
            <li>System validates worker-role coverage</li>
            <li>Jobs only created when fully validated</li>
          </ol>
        </div>
      </div>
    ),
    category: 'Getting Started',
    roles: ['admin', 'sales', 'worker', 'client'],
    priority: 'high',
    keywords: ['overview', 'introduction', 'what is', 'how it works', 'workflow']
  },

  {
    id: 'user-roles',
    question: 'What are the different user roles and their permissions?',
    answer: (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4 bg-red-50 border-red-200">
            <h4 className="font-semibold text-red-900 mb-2 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Admin
            </h4>
            <ul className="text-sm text-red-800 space-y-1">
              <li>• Full system access</li>
              <li>• Manage all users and roles</li>
              <li>• Create and assign jobs</li>
              <li>• Access all reports</li>
              <li>• Team management</li>
            </ul>
          </div>

          <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
              <Briefcase className="h-4 w-4 mr-2" />
              Sales
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Create and manage jobs</li>
              <li>• Manage clients</li>
              <li>• Assign workers to jobs</li>
              <li>• View team performance</li>
              <li>• Limited user management</li>
            </ul>
          </div>

          <div className="border rounded-lg p-4 bg-green-50 border-green-200">
            <h4 className="font-semibold text-green-900 mb-2 flex items-center">
              <UserCheck className="h-4 w-4 mr-2" />
              Worker
            </h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• View assigned jobs</li>
              <li>• Update job status</li>
              <li>• Manage own availability</li>
              <li>• View team information</li>
              <li>• Update certifications</li>
            </ul>
          </div>

          <div className="border rounded-lg p-4 bg-purple-50 border-purple-200">
            <h4 className="font-semibold text-purple-900 mb-2 flex items-center">
              <Settings className="h-4 w-4 mr-2" />
              Client
            </h4>
            <ul className="text-sm text-purple-800 space-y-1">
              <li>• View own jobs</li>
              <li>• Job status updates</li>
              <li>• Limited dashboard access</li>
              <li>• Communication with team</li>
            </ul>
          </div>
        </div>
      </div>
    ),
    category: 'Getting Started',
    roles: ['admin', 'sales', 'worker', 'client'],
    priority: 'high',
    keywords: ['roles', 'permissions', 'admin', 'sales', 'worker', 'client', 'access']
  },

  // Job Roles Management
  {
    id: 'what-are-job-roles',
    question: 'What are job roles and why are they important?',
    answer: (
      <div className="space-y-4">
        <p>Job roles define the different types of skills and specializations needed for your business. They are the foundation of the scheduling system.</p>
        
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h4 className="font-semibold text-yellow-900 mb-2 flex items-center">
            <Star className="h-4 w-4 mr-2" />
            Why Job Roles Matter:
          </h4>
          <ul className="list-disc list-inside space-y-1 text-yellow-800">
            <li>Ensure the right person is assigned to the right job</li>
            <li>Maintain quality standards and expertise requirements</li>
            <li>Enable accurate pricing based on skill level</li>
            <li>Prevent scheduling conflicts and mismatched assignments</li>
            <li>Track worker capabilities and training needs</li>
          </ul>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">Common Job Role Examples:</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-blue-800">
            <div>• Window Cleaner</div>
            <div>• Landscaper</div>
            <div>• Pressure Washer</div>
            <div>• Tree Specialist</div>
            <div>• General Labor</div>
            <div>• Equipment Operator</div>
          </div>
        </div>
      </div>
    ),
    category: 'Job Roles',
    roles: ['admin', 'sales'],
    priority: 'high',
    keywords: ['job roles', 'what are', 'importance', 'skills', 'specialization']
  },

  {
    id: 'create-job-roles',
    question: 'How do I create and set up job roles?',
    answer: (
      <div className="space-y-4">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-900 mb-3 flex items-center">
            <Target className="h-4 w-4 mr-2" />
            Step-by-Step Guide:
          </h4>
          <ol className="list-decimal list-inside space-y-2 text-green-800">
            <li>Navigate to <strong>Job Roles</strong> in the sidebar</li>
            <li>Click <strong>"Create New Role"</strong> button</li>
            <li>Fill out the role details:
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li><strong>Name:</strong> Clear, descriptive title (e.g., "Window Cleaner")</li>
                <li><strong>Description:</strong> What this role does</li>
                <li><strong>Hourly Rate:</strong> Base pay rate for this role</li>
                <li><strong>Certifications:</strong> Required skills/licenses</li>
                <li><strong>Physical Demands:</strong> Light, Medium, or Heavy</li>
                <li><strong>Equipment:</strong> Tools/equipment needed</li>
                <li><strong>Color:</strong> Visual identifier for the UI</li>
              </ul>
            </li>
            <li>Click <strong>"Save"</strong> to create the role</li>
          </ol>
        </div>

        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <h4 className="font-semibold text-red-900 mb-2 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Important Notes:
          </h4>
          <ul className="list-disc list-inside space-y-1 text-red-800">
            <li>Create roles BEFORE adding workers to your team</li>
            <li>Be specific with role names to avoid confusion</li>
            <li>Set realistic hourly rates based on skill requirements</li>
            <li>Use certifications to ensure quality standards</li>
          </ul>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">Best Practices:</h4>
          <ul className="list-disc list-inside space-y-1 text-blue-800">
            <li>Start with 3-5 essential roles for your business</li>
            <li>Use consistent naming conventions</li>
            <li>Set appropriate certification requirements</li>
            <li>Choose distinct colors for easy visual identification</li>
          </ul>
        </div>
      </div>
    ),
    category: 'Job Roles',
    roles: ['admin', 'sales'],
    priority: 'high',
    keywords: ['create roles', 'setup', 'job roles', 'how to create', 'step by step']
  },

  // Worker Management
  {
    id: 'assign-workers-to-roles',
    question: 'How do I assign workers to job roles?',
    answer: (
      <div className="space-y-4">
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <h4 className="font-semibold text-red-900 mb-2 flex items-center">
            <Zap className="h-4 w-4 mr-2" />
            CRITICAL: This step is essential for job creation!
          </h4>
          <p className="text-red-800">Workers must be assigned to roles before jobs can be created with those role requirements.</p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-900 mb-3">Step-by-Step Process:</h4>
          <ol className="list-decimal list-inside space-y-2 text-green-800">
            <li>Go to <strong>Workers</strong> page in the sidebar</li>
            <li>Click on a worker's name to view their profile</li>
            <li>Navigate to the <strong>"Roles"</strong> tab</li>
            <li>Click <strong>"Assign New Role"</strong></li>
            <li>Select the job role from the dropdown</li>
            <li>Set the proficiency level (1-5 stars)</li>
            <li>Add any notes about their experience</li>
            <li>Click <strong>"Assign Role"</strong></li>
            <li>Repeat for all relevant roles</li>
          </ol>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h4 className="font-semibold text-yellow-900 mb-2">Example Assignment:</h4>
          <div className="text-yellow-800">
            <p><strong>Worker:</strong> John Smith</p>
            <p><strong>Assigned Roles:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Window Cleaner (5-star proficiency)</li>
              <li>Pressure Washing (3-star proficiency)</li>
              <li>General Labor (4-star proficiency)</li>
            </ul>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">Pro Tips:</h4>
          <ul className="list-disc list-inside space-y-1 text-blue-800">
            <li>Assign multiple roles to increase scheduling flexibility</li>
            <li>Update proficiency levels as workers gain experience</li>
            <li>Use notes to track special certifications or training</li>
            <li>Review role assignments regularly</li>
          </ul>
        </div>
      </div>
    ),
    category: 'Workers',
    roles: ['admin', 'sales'],
    priority: 'high',
    keywords: ['assign workers', 'worker roles', 'assignment', 'proficiency', 'how to assign']
  },

  {
    id: 'worker-availability',
    question: 'How do I set up worker availability and schedules?',
    answer: (
      <div className="space-y-4">
        <p>Worker availability is crucial for the job creation system to know when workers can be assigned to jobs.</p>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-900 mb-3">Setting Default Schedules:</h4>
          <ol className="list-decimal list-inside space-y-2 text-green-800">
            <li>Navigate to a worker's profile page</li>
            <li>Go to the <strong>"Schedule"</strong> tab</li>
            <li>Set availability for each day of the week:
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>Check "Available" for working days</li>
                <li>Set start and end times</li>
                <li>Add break periods if needed</li>
              </ul>
            </li>
            <li>Save the default schedule</li>
          </ol>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">Managing Exceptions:</h4>
          <ul className="list-disc list-inside space-y-1 text-blue-800">
            <li>Add vacation days and time off</li>
            <li>Set temporary schedule changes</li>
            <li>Mark sick days or unavailability</li>
            <li>Override default hours for specific dates</li>
          </ul>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h4 className="font-semibold text-yellow-900 mb-2">Impact on Job Creation:</h4>
          <p className="text-yellow-800">The job wizard checks worker availability in real-time. If a worker is not available during the requested job time, they won't be considered for assignment, even if they have the required role.</p>
        </div>
      </div>
    ),
    category: 'Workers',
    roles: ['admin', 'sales', 'worker'],
    priority: 'medium',
    keywords: ['availability', 'schedule', 'working hours', 'time off', 'exceptions']
  },

  // Job Creation
  {
    id: 'job-creation-wizard',
    question: 'How does the 6-step job creation wizard work?',
    answer: (
      <div className="space-y-4">
        <p>The job creation wizard guides you through a structured process to ensure all job requirements are met before creation.</p>

        <div className="space-y-3">
          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="font-semibold">Step 1: Basic Information</h4>
            <p className="text-sm text-muted-foreground">Job type, address, and special notes</p>
          </div>
          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="font-semibold">Step 2: Client Selection</h4>
            <p className="text-sm text-muted-foreground">Choose existing client or create new one</p>
          </div>
          <div className="border-l-4 border-purple-500 pl-4">
            <h4 className="font-semibold">Step 3: Pricing</h4>
            <p className="text-sm text-muted-foreground">Set quote amount and payment terms</p>
          </div>
          <div className="border-l-4 border-orange-500 pl-4">
            <h4 className="font-semibold">Step 4: Schedule</h4>
            <p className="text-sm text-muted-foreground">Date, time, and number of workers needed</p>
          </div>
          <div className="border-l-4 border-red-500 pl-4">
            <h4 className="font-semibold">Step 5: Role Requirements</h4>
            <p className="text-sm text-muted-foreground">Select which job roles are required</p>
          </div>
          <div className="border-l-4 border-cyan-500 pl-4">
            <h4 className="font-semibold">Step 6: Review & Validation</h4>
            <p className="text-sm text-muted-foreground">System validates worker-role coverage before creation</p>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-900 mb-2 flex items-center">
            <CheckCircle className="h-4 w-4 mr-2" />
            New Enhanced Validation:
          </h4>
          <p className="text-green-800">The system now performs strict validation in Step 6. Jobs can only be created when ALL required roles have qualified, available workers.</p>
        </div>
      </div>
    ),
    category: 'Job Creation',
    roles: ['admin', 'sales'],
    priority: 'high',
    keywords: ['job wizard', 'job creation', '6 steps', 'how to create jobs', 'wizard']
  },

  {
    id: 'validation-errors',
    question: 'What do the job creation validation errors mean and how do I fix them?',
    answer: (
      <div className="space-y-4">
        <p>The enhanced job creation system provides detailed validation to prevent scheduling problems. Here's what each error means:</p>

        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-red-50 border-red-200">
            <h4 className="font-semibold text-red-900 mb-2 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              ❌ "No Workers for Role"
            </h4>
            <p className="text-red-800 mb-2"><strong>What it means:</strong> No workers are assigned to a required role.</p>
            <div className="text-red-800">
              <strong>How to fix:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Go to Workers page and assign workers to the role</li>
                <li>Remove the role requirement from the job</li>
                <li>Train existing workers for the role</li>
              </ul>
            </div>
          </div>

          <div className="border rounded-lg p-4 bg-orange-50 border-orange-200">
            <h4 className="font-semibold text-orange-900 mb-2 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              ⚠️ "Workers Unavailable"
            </h4>
            <p className="text-orange-800 mb-2"><strong>What it means:</strong> Workers with the role exist but are not available during the job time.</p>
            <div className="text-orange-800">
              <strong>How to fix:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Try different time slots when workers are available</li>
                <li>Reschedule conflicting jobs</li>
                <li>Add more workers to the role</li>
                <li>Update worker availability schedules</li>
              </ul>
            </div>
          </div>

          <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
            <h4 className="font-semibold text-yellow-900 mb-2 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              ❌ "Insufficient Workers"
            </h4>
            <p className="text-yellow-800 mb-2"><strong>What it means:</strong> Not enough qualified workers for the number required.</p>
            <div className="text-yellow-800">
              <strong>How to fix:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Reduce the number of workers required</li>
                <li>Train more workers for the role</li>
                <li>Split the job into multiple smaller jobs</li>
                <li>Hire additional workers with the required skills</li>
              </ul>
            </div>
          </div>

          <div className="border rounded-lg p-4 bg-green-50 border-green-200">
            <h4 className="font-semibold text-green-900 mb-2 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              ✅ "All Roles Covered"
            </h4>
            <p className="text-green-800 mb-2"><strong>What it means:</strong> Perfect! All roles have qualified, available workers.</p>
            <div className="text-green-800">
              <strong>What happens:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Cost breakdown is displayed</li>
                <li>"Create Job" button becomes active</li>
                <li>Job can be successfully created</li>
                <li>Workers are automatically assigned</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    ),
    category: 'Job Creation',
    roles: ['admin', 'sales'],
    priority: 'high',
    keywords: ['validation errors', 'job creation errors', 'troubleshooting', 'fix errors', 'worker coverage']
  },

  // Troubleshooting
  {
    id: 'job-creation-blocked',
    question: 'Why is job creation blocked and how do I fix it?',
    answer: (
      <div className="space-y-4">
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <h4 className="font-semibold text-red-900 mb-2">Common Reasons Jobs Are Blocked:</h4>
          <ul className="list-disc list-inside space-y-1 text-red-800">
            <li>Required roles have no assigned workers</li>
            <li>Workers are unavailable during the scheduled time</li>
            <li>Insufficient workers for the quantity required</li>
            <li>Scheduling conflicts with existing jobs</li>
          </ul>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-3">Systematic Troubleshooting:</h4>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li><strong>Check the Review step:</strong> Look for red error indicators</li>
            <li><strong>Review role assignments:</strong> Ensure workers are assigned to required roles</li>
            <li><strong>Verify availability:</strong> Check worker schedules for the job time</li>
            <li><strong>Adjust requirements:</strong> Reduce worker count or change timing if needed</li>
            <li><strong>Train workers:</strong> Assign additional workers to uncovered roles</li>
          </ol>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-900 mb-2">Quick Fix Checklist:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-green-800">
            <div>□ All roles have assigned workers</div>
            <div>□ Workers are available at job time</div>
            <div>□ Sufficient worker quantity</div>
            <div>□ No scheduling conflicts</div>
            <div>□ Worker certifications valid</div>
            <div>□ Role requirements realistic</div>
          </div>
        </div>
      </div>
    ),
    category: 'Troubleshooting',
    roles: ['admin', 'sales'],
    priority: 'high',
    keywords: ['job blocked', 'cannot create job', 'troubleshooting', 'job creation problems']
  },

  // Complete Workflow Showcase
  {
    id: 'complete-workflow',
    question: '🎯 COMPLETE GUIDE: From Setup to Success - Creating Your First Job',
    answer: (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg border border-blue-200">
          <h4 className="text-xl font-bold text-blue-900 mb-3 flex items-center">
            <Target className="h-6 w-6 mr-2" />
            Complete Workflow Demonstration
          </h4>
          <p className="text-blue-800">
            This comprehensive guide shows you exactly how to set up Dynamic Crew Scheduler from scratch and create your first successful job. 
            Follow these steps in order for a perfect setup.
          </p>
        </div>

        <div className="space-y-6">
          {/* Phase 1: Create Job Roles */}
          <div className="border-l-4 border-blue-500 pl-6 bg-blue-50 p-4 rounded-r-lg">
            <h5 className="font-bold text-blue-900 text-lg mb-3">Phase 1: Create Job Roles</h5>
            <div className="space-y-3">
              <div className="bg-white p-4 rounded border">
                <h6 className="font-semibold mb-2">Step 1.1: Navigate to Job Roles</h6>
                <p className="text-sm text-gray-700 mb-2">Go to <strong>Job Roles</strong> in the sidebar → Click <strong>"Create New Role"</strong></p>
                
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <strong>Example Role 1 - Window Cleaner:</strong><br/>
                  • Name: "Window Cleaner"<br/>
                  • Description: "Professional window cleaning services"<br/>
                  • Hourly Rate: $25.00<br/>
                  • Certifications: ["Window Cleaning Certification"]<br/>
                  • Physical Demands: Light<br/>
                  • Equipment: ["Squeegees", "Cleaning Solutions", "Ladder"]<br/>
                  • Color: Green (#10B981)
                </div>
              </div>

              <div className="bg-white p-4 rounded border">
                <h6 className="font-semibold mb-2">Step 1.2: Create Second Role</h6>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <strong>Example Role 2 - Landscaper:</strong><br/>
                  • Name: "Landscaper"<br/>
                  • Description: "Garden and landscape maintenance"<br/>
                  • Hourly Rate: $30.00<br/>
                  • Certifications: ["Landscaping License"]<br/>
                  • Physical Demands: Heavy<br/>
                  • Equipment: ["Landscaping Tools", "Mower"]<br/>
                  • Color: Lime (#84CC16)
                </div>
              </div>

              <div className="bg-green-100 p-3 rounded">
                <strong>✅ Result:</strong> You now have 2 job roles that can be assigned to workers and required for jobs.
              </div>
            </div>
          </div>

          {/* Phase 2: Add Workers */}
          <div className="border-l-4 border-green-500 pl-6 bg-green-50 p-4 rounded-r-lg">
            <h5 className="font-bold text-green-900 text-lg mb-3">Phase 2: Add Workers to Your Team</h5>
            <div className="space-y-3">
              <div className="bg-white p-4 rounded border">
                <h6 className="font-semibold mb-2">Step 2.1: Invite Workers</h6>
                <p className="text-sm text-gray-700">Go to <strong>Team Management</strong> → Click <strong>"Invite User"</strong> → Enter email addresses for your workers</p>
                
                <div className="bg-gray-50 p-3 rounded text-sm mt-2">
                  <strong>Example:</strong> Invite john@email.com and sarah@email.com as "worker" role
                </div>
              </div>

              <div className="bg-white p-4 rounded border">
                <h6 className="font-semibold mb-2">Step 2.2: Workers Accept Invitations</h6>
                <p className="text-sm text-gray-700">Workers receive email invitations → They create accounts → Complete setup process</p>
              </div>

              <div className="bg-green-100 p-3 rounded">
                <strong>✅ Result:</strong> John Smith and Sarah Johnson are now part of your team and appear in the Workers section.
              </div>
            </div>
          </div>

          {/* Phase 3: Assign Workers to Roles */}
          <div className="border-l-4 border-purple-500 pl-6 bg-purple-50 p-4 rounded-r-lg">
            <h5 className="font-bold text-purple-900 text-lg mb-3">Phase 3: Assign Workers to Roles (CRITICAL STEP)</h5>
            <div className="space-y-3">
              <div className="bg-red-50 p-3 rounded border border-red-200">
                <strong className="text-red-900">⚠️ IMPORTANT:</strong> This step is essential! Jobs cannot be created without worker-role assignments.
              </div>

              <div className="bg-white p-4 rounded border">
                <h6 className="font-semibold mb-2">Step 3.1: Assign John to Roles</h6>
                <p className="text-sm text-gray-700 mb-2">Workers page → Click "John Smith" → Go to "Roles" tab → Assign roles:</p>
                
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <strong>John Smith Assignments:</strong><br/>
                  • Window Cleaner (5-star proficiency)<br/>
                  • Landscaper (3-star proficiency)
                </div>
              </div>

              <div className="bg-white p-4 rounded border">
                <h6 className="font-semibold mb-2">Step 3.2: Assign Sarah to Roles</h6>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <strong>Sarah Johnson Assignments:</strong><br/>
                  • Landscaper (5-star proficiency)<br/>
                  • Window Cleaner (2-star proficiency)
                </div>
              </div>

              <div className="bg-green-100 p-3 rounded">
                <strong>✅ Result:</strong> Both roles now have qualified workers assigned. Job creation will be possible!
              </div>
            </div>
          </div>

          {/* Phase 4: Set Availability */}
          <div className="border-l-4 border-orange-500 pl-6 bg-orange-50 p-4 rounded-r-lg">
            <h5 className="font-bold text-orange-900 text-lg mb-3">Phase 4: Set Worker Availability</h5>
            <div className="space-y-3">
              <div className="bg-white p-4 rounded border">
                <h6 className="font-semibold mb-2">Step 4.1: Set John's Schedule</h6>
                <p className="text-sm text-gray-700 mb-2">John Smith profile → "Schedule" tab → Set default availability:</p>
                
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <strong>John's Schedule:</strong><br/>
                  • Monday-Friday: 8:00 AM - 5:00 PM (Available)<br/>
                  • Saturday: 9:00 AM - 2:00 PM (Available)<br/>
                  • Sunday: Not Available
                </div>
              </div>

              <div className="bg-white p-4 rounded border">
                <h6 className="font-semibold mb-2">Step 4.2: Set Sarah's Schedule</h6>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <strong>Sarah's Schedule:</strong><br/>
                  • Monday-Friday: 7:00 AM - 4:00 PM (Available)<br/>
                  • Saturday-Sunday: Not Available
                </div>
              </div>

              <div className="bg-green-100 p-3 rounded">
                <strong>✅ Result:</strong> Worker availability is set. The system can now check scheduling conflicts.
              </div>
            </div>
          </div>

          {/* Phase 5: Create Client */}
          <div className="border-l-4 border-cyan-500 pl-6 bg-cyan-50 p-4 rounded-r-lg">
            <h5 className="font-bold text-cyan-900 text-lg mb-3">Phase 5: Create a Client</h5>
            <div className="space-y-3">
              <div className="bg-white p-4 rounded border">
                <h6 className="font-semibold mb-2">Step 5.1: Add Client Information</h6>
                <p className="text-sm text-gray-700 mb-2">Clients page → "Add New Client" → Fill out details:</p>
                
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <strong>Example Client:</strong><br/>
                  • Name: "Sunshine Office Complex"<br/>
                  • Email: "manager@sunshineoffice.com"<br/>
                  • Phone: "(555) 123-4567"<br/>
                  • Address: "123 Business Park Dr"
                </div>
              </div>

              <div className="bg-green-100 p-3 rounded">
                <strong>✅ Result:</strong> Client is created and available for job assignment.
              </div>
            </div>
          </div>

          {/* Phase 6: Create Test Job */}
          <div className="border-l-4 border-red-500 pl-6 bg-red-50 p-4 rounded-r-lg">
            <h5 className="font-bold text-red-900 text-lg mb-3">Phase 6: Create Your First Job</h5>
            <div className="space-y-3">
              <div className="bg-white p-4 rounded border">
                <h6 className="font-semibold mb-2">Step 6.1: Start Job Creation Wizard</h6>
                <p className="text-sm text-gray-700 mb-2">Jobs page → "Create New Job" → Fill out the 6-step wizard:</p>
                
                <div className="bg-gray-50 p-3 rounded text-sm space-y-2">
                  <div><strong>Step 1 - Basic Info:</strong><br/>
                  Job Type: "Monthly Window & Landscape Maintenance"<br/>
                  Address: "123 Business Park Dr"<br/>
                  Notes: "Include interior windows on first floor"</div>
                  
                  <div><strong>Step 2 - Client:</strong><br/>
                  Select: "Sunshine Office Complex"</div>
                  
                  <div><strong>Step 3 - Pricing:</strong><br/>
                  Quote Amount: $300.00<br/>
                  Remaining Balance: $300.00</div>
                  
                  <div><strong>Step 4 - Schedule:</strong><br/>
                  Date: Next Wednesday<br/>
                  Time: 9:00 AM - 1:00 PM<br/>
                  Workers Needed: 2</div>
                  
                  <div><strong>Step 5 - Roles:</strong><br/>
                  Required Roles: Window Cleaner, Landscaper</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded border">
                <h6 className="font-semibold mb-2">Step 6.2: Review & Validation</h6>
                <p className="text-sm text-gray-700 mb-2">Step 6 shows comprehensive validation results:</p>
                
                <div className="space-y-2">
                  <div className="bg-green-100 p-3 rounded border border-green-300 text-sm">
                    <strong className="text-green-900">✅ Window Cleaner: Covered</strong><br/>
                    John (5-star) and Sarah (2-star) both available and qualified
                  </div>
                  
                  <div className="bg-green-100 p-3 rounded border border-green-300 text-sm">
                    <strong className="text-green-900">✅ Landscaper: Covered</strong><br/>
                    John (3-star) and Sarah (5-star) both available and qualified
                  </div>
                  
                  <div className="bg-green-100 p-3 rounded border border-green-300 text-sm">
                    <strong className="text-green-900">✅ Final Cost: $220.00</strong><br/>
                    John: $100 (4 hrs × $25), Sarah: $120 (4 hrs × $30)
                  </div>
                </div>
              </div>

              <div className="bg-green-100 p-3 rounded">
                <strong>✅ SUCCESS:</strong> Job is created! Workers are automatically assigned. The "Create Job" button was active because all validation passed.
              </div>
            </div>
          </div>

          {/* Phase 7: What Happens Next */}
          <div className="border-l-4 border-indigo-500 pl-6 bg-indigo-50 p-4 rounded-r-lg">
            <h5 className="font-bold text-indigo-900 text-lg mb-3">Phase 7: What Happens After Job Creation</h5>
            <div className="space-y-3">
              <div className="bg-white p-4 rounded border">
                <h6 className="font-semibold mb-2">Automatic System Actions:</h6>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  <li>John and Sarah are automatically assigned to the job</li>
                  <li>Job appears in workers' "My Jobs" section</li>
                  <li>Calendar is updated with the scheduled work</li>
                  <li>Client receives job confirmation (if configured)</li>
                  <li>System blocks conflicting time slots for these workers</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded border">
                <h6 className="font-semibold mb-2">Workers Can Now:</h6>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  <li>View job details and requirements</li>
                  <li>Update job status as work progresses</li>
                  <li>Communicate with the team</li>
                  <li>Mark job as completed when finished</li>
                </ul>
              </div>

              <div className="bg-green-100 p-3 rounded">
                <strong>🎉 CONGRATULATIONS!</strong> You've successfully completed the entire workflow from setup to job creation!
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200">
          <h4 className="font-bold text-green-900 mb-3 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            Key Success Factors
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="font-semibold text-green-800">Essential Setup:</div>
              <ul className="list-disc list-inside text-green-700 space-y-1">
                <li>Create job roles before adding workers</li>
                <li>Assign workers to ALL relevant roles</li>
                <li>Set realistic worker availability</li>
                <li>Use descriptive, clear role names</li>
              </ul>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-green-800">Job Creation Success:</div>
              <ul className="list-disc list-inside text-green-700 space-y-1">
                <li>All required roles must have workers</li>
                <li>Workers must be available at job time</li>
                <li>Sufficient worker quantity needed</li>
                <li>No scheduling conflicts allowed</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    ),
    category: 'Complete Guide',
    roles: ['admin', 'sales'],
    priority: 'high',
    keywords: ['complete guide', 'workflow', 'setup', 'first job', 'demonstration', 'step by step', 'showcase']
  }
]

export function FAQContent({ userRole }: FAQContentProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [openItems, setOpenItems] = useState<string[]>(['overview']) // Start with overview open

  // Filter FAQ items based on user role, search term, and category
  const filteredFAQs = faqData.filter(item => {
    const matchesRole = item.roles.includes(userRole)
    const matchesSearch = searchTerm === '' || 
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory
    
    return matchesRole && matchesSearch && matchesCategory
  })

  const categories = ['All', ...Array.from(new Set(faqData.map(item => item.category)))]

  const toggleItem = (itemId: string) => {
    setOpenItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Find What You Need</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search FAQ items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Showing {filteredFAQs.length} item(s) for <Badge variant="outline">{userRole}</Badge> role
          </div>
        </CardContent>
      </Card>

      {/* FAQ Items */}
      <div className="space-y-3">
        {filteredFAQs.map((item) => (
          <Card key={item.id} className={`transition-all duration-200 ${openItems.includes(item.id) ? 'ring-2 ring-blue-200' : ''}`}>
            <Collapsible
              open={openItems.includes(item.id)}
              onOpenChange={() => toggleItem(item.id)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`h-2 w-2 rounded-full ${
                        item.priority === 'high' ? 'bg-red-500' :
                        item.priority === 'medium' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`} />
                      <CardTitle className="text-left text-lg">{item.question}</CardTitle>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="text-xs">
                        {item.category}
                      </Badge>
                      {openItems.includes(item.id) ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronRight className="h-4 w-4" />
                      }
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="prose prose-sm max-w-none">
                    {item.answer}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      {filteredFAQs.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Info className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">
              No FAQ items found matching your search criteria.
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('')
                setSelectedCategory('All')
              }}
              className="mt-2"
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Links Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ArrowRight className="h-5 w-5 text-blue-600" />
            <span>Ready to Get Started?</span>
          </CardTitle>
          <CardDescription>
            Follow these links to begin setting up your workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(userRole === 'admin' || userRole === 'sales') && (
              <>
                <Button variant="outline" className="justify-start h-auto p-4" asChild>
                  <a href="/dashboard/roles">
                    <div className="text-left">
                      <div className="font-semibold">Create Job Roles</div>
                      <div className="text-xs text-muted-foreground">Define your business roles</div>
                    </div>
                  </a>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4" asChild>
                  <a href="/dashboard/workers">
                    <div className="text-left">
                      <div className="font-semibold">Manage Workers</div>
                      <div className="text-xs text-muted-foreground">Assign roles to workers</div>
                    </div>
                  </a>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4" asChild>
                  <a href="/dashboard/jobs/new">
                    <div className="text-left">
                      <div className="font-semibold">Create First Job</div>
                      <div className="text-xs text-muted-foreground">Test the job wizard</div>
                    </div>
                  </a>
                </Button>
              </>
            )}
            {userRole === 'worker' && (
              <>
                <Button variant="outline" className="justify-start h-auto p-4" asChild>
                  <a href="/dashboard/jobs">
                    <div className="text-left">
                      <div className="font-semibold">View My Jobs</div>
                      <div className="text-xs text-muted-foreground">See assigned work</div>
                    </div>
                  </a>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4" asChild>
                  <a href="/dashboard/team">
                    <div className="text-left">
                      <div className="font-semibold">Team Information</div>
                      <div className="text-xs text-muted-foreground">View team details</div>
                    </div>
                  </a>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4" asChild>
                  <a href="/dashboard/settings">
                    <div className="text-left">
                      <div className="font-semibold">My Settings</div>
                      <div className="text-xs text-muted-foreground">Update preferences</div>
                    </div>
                  </a>
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}