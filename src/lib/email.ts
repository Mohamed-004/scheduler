/**
 * Email service for sending invitation and notification emails
 * Currently logs to console for development - can be extended with real email providers
 */

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
 * Send an email (currently logs to console for development)
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    // For development, log the email content
    console.log('📧 EMAIL WOULD BE SENT:')
    console.log('To:', options.to)
    console.log('Subject:', options.subject)
    console.log('Content:', options.html)
    console.log('---')
    
    // TODO: Implement real email sending with providers like:
    // - Resend
    // - SendGrid
    // - AWS SES
    // - Nodemailer with SMTP
    
    return { success: true }
  } catch (error) {
    console.error('Email sending error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Send invitation email to new team member
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
 * Send role change notification email
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
          
          <p><small>If you didn't expect this role change, please contact your administrator.</small></p>
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
    
    Accept role change: ${data.invitationUrl}
    
    This invitation expires on ${data.expiresAt}
    
    If you didn't expect this role change, please contact your administrator.
  `
  
  return await sendEmail({
    to: data.email,
    subject,
    html,
    text
  })
} 