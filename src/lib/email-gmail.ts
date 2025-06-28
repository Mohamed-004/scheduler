/**
 * Alternative Gmail SMTP Email Service
 * Simple backup option using Gmail SMTP
 */

import nodemailer from 'nodemailer'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

interface InvitationEmailData {
  email: string
  name?: string
  role: string
  inviterName: string
  invitationUrl: string
  expiresAt: string
}

/**
 * Send email using Gmail SMTP
 * Requires Gmail App Password (not regular password)
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if running on client-side (should not happen)
    if (typeof window !== 'undefined') {
      console.error('❌ Email service called on client-side')
      return { success: false, error: 'Email service called on client-side' }
    }

    // For development, log the email content
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 SENDING EMAIL via Gmail SMTP:')
      console.log('To:', options.to)
      console.log('Subject:', options.subject)
      console.log('---')
    }
    
    // Check if Gmail credentials are configured
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('Gmail SMTP not configured. Need GMAIL_USER and GMAIL_APP_PASSWORD')
      return { success: false, error: 'Gmail SMTP not configured' }
    }

    // Create Gmail SMTP transporter
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    })

    // Send email
    const result = await transporter.sendMail({
      from: `"Scheduler App" <${process.env.GMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
      replyTo: process.env.EMAIL_REPLY_TO || process.env.GMAIL_USER
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Email sent successfully via Gmail:', result.messageId)
    }
    
    return { success: true }
  } catch (error: any) {
    console.error('Gmail SMTP error:', error.message)
    return { 
      success: false, 
      error: error.message || 'Failed to send email'
    }
  }
}

/**
 * Send invitation email using Gmail SMTP
 */
export async function sendInvitationEmail(data: InvitationEmailData): Promise<{ success: boolean; error?: string }> {
  const subject = `You're invited to join the team as ${data.role}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Team Invitation</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563EB; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .role-badge { display: inline-block; background: #84CC16; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 You're Invited!</h1>
          <p>Join our team as a <span class="role-badge">${data.role.toUpperCase()}</span></p>
        </div>
        <div class="content">
          <p>Hi${data.name ? ` ${data.name}` : ''},</p>
          
          <p><strong>${data.inviterName}</strong> has invited you to join the team with the role of <strong>${data.role}</strong>.</p>
          
          <p>Click the button below to accept your invitation and create your account:</p>
          
          <div style="text-align: center;">
            <a href="${data.invitationUrl}" class="button">Accept Invitation</a>
          </div>
          
          <p><small>Or copy and paste this link into your browser:</small><br>
          <code style="background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${data.invitationUrl}</code></p>
          
          <p><strong>⏰ This invitation expires on ${data.expiresAt}</strong></p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          
          <p><small>If you didn't expect this invitation, you can safely ignore this email.</small></p>
        </div>
        <div class="footer">
          <p>Powered by Dynamic Crew Scheduler</p>
        </div>
      </div>
    </body>
    </html>
  `
  
  const text = `
    You're invited to join the team!
    
    ${data.inviterName} has invited you to join the team with the role of ${data.role}.
    
    Accept your invitation: ${data.invitationUrl}
    
    This invitation expires on ${data.expiresAt}
    
    If you didn't expect this invitation, you can safely ignore this email.
  `
  
  return await sendEmail({
    to: data.email,
    subject,
    html,
    text
  })
}

/**
 * Send role change notification using Gmail SMTP
 */
export async function sendRoleChangeEmail(data: InvitationEmailData): Promise<{ success: boolean; error?: string }> {
  const subject = `Your role has been updated to ${data.role}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Role Update</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #84CC16; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #84CC16; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .role-badge { display: inline-block; background: #2563EB; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔄 Role Updated</h1>
          <p>Your new role: <span class="role-badge">${data.role.toUpperCase()}</span></p>
        </div>
        <div class="content">
          <p>Hi${data.name ? ` ${data.name}` : ''},</p>
          
          <p><strong>${data.inviterName}</strong> has updated your role to <strong>${data.role}</strong>.</p>
          
          <p>Click the button below to accept this role change:</p>
          
          <div style="text-align: center;">
            <a href="${data.invitationUrl}" class="button">Accept Role Change</a>
          </div>
          
          <p><small>Or copy and paste this link into your browser:</small><br>
          <code style="background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${data.invitationUrl}</code></p>
          
          <p><strong>⏰ This invitation expires on ${data.expiresAt}</strong></p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          
          <p><small>If you didn't expect this role change, please contact your team administrator.</small></p>
        </div>
        <div class="footer">
          <p>Powered by Dynamic Crew Scheduler</p>
        </div>
      </div>
    </body>
    </html>
  `
  
  const text = `
    Your role has been updated!
    
    ${data.inviterName} has updated your role to ${data.role}.
    
    Accept this role change: ${data.invitationUrl}
    
    This invitation expires on ${data.expiresAt}
    
    If you didn't expect this role change, please contact your team administrator.
  `
  
  return await sendEmail({
    to: data.email,
    subject,
    html,
    text
  })
} 