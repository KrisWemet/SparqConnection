import sgMail from '@sendgrid/mail'

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'hello@sparqconnection.com'
const FROM_NAME = process.env.FROM_NAME || 'Sparq Connection'

if (!SENDGRID_API_KEY) {
  console.warn('SendGrid API key not found. Email functionality will be disabled.')
} else {
  sgMail.setApiKey(SENDGRID_API_KEY)
}

export interface EmailOptions {
  to: string
  toName?: string
  subject: string
  html: string
  text?: string
  trackingOptions?: {
    clickTracking?: boolean
    openTracking?: boolean
    subscriptionTracking?: boolean
  }
}

export interface InviteEmailData {
  inviterName: string
  inviterEmail: string
  inviteLink: string
  inviteCode: string
  expiresAt: string
}

export class EmailService {
  private isEnabled: boolean

  constructor() {
    this.isEnabled = !!SENDGRID_API_KEY
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isEnabled) {
      console.warn('Email service is disabled - no SendGrid API key')
      return { success: false, error: 'Email service not configured' }
    }

    try {
      const msg = {
        to: {
          email: options.to,
          name: options.toName
        },
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME
        },
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
        trackingSettings: {
          clickTracking: { 
            enable: options.trackingOptions?.clickTracking ?? true 
          },
          openTracking: { 
            enable: options.trackingOptions?.openTracking ?? true 
          },
          subscriptionTracking: { 
            enable: options.trackingOptions?.subscriptionTracking ?? false 
          }
        },
        categories: ['sparq-connection', 'invite-system']
      }

      const [response] = await sgMail.send(msg)
      
      return {
        success: true,
        messageId: response.headers['x-message-id']
      }
    } catch (error) {
      console.error('Email sending failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown email error'
      }
    }
  }

  async sendInviteEmail(to: string, data: InviteEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const subject = `${data.inviterName} invited you to join Sparq Connection ✨`
    const html = this.generateInviteEmailHTML(data)
    const text = this.generateInviteEmailText(data)

    return this.sendEmail({
      to,
      subject,
      html,
      text,
      trackingOptions: {
        clickTracking: true,
        openTracking: true,
        subscriptionTracking: false
      }
    })
  }

  private generateInviteEmailHTML(data: InviteEmailData): string {
    const expiryDate = new Date(data.expiresAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to Sparq Connection</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
    .header p { color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px; }
    .content { padding: 40px 30px; }
    .invitation-box { background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
    .invitation-message { font-size: 18px; color: #1e293b; margin-bottom: 20px; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; transition: transform 0.2s; }
    .cta-button:hover { transform: translateY(-2px); }
    .features { margin: 40px 0; }
    .feature { display: flex; align-items: center; margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 8px; }
    .feature-icon { font-size: 24px; margin-right: 16px; }
    .feature-text { flex: 1; }
    .feature-title { font-weight: 600; color: #1e293b; margin-bottom: 4px; }
    .feature-desc { font-size: 14px; color: #64748b; }
    .code-section { background: #1e293b; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
    .invite-code { font-family: 'Monaco', 'Menlo', monospace; font-size: 24px; letter-spacing: 4px; font-weight: bold; margin: 10px 0; }
    .footer { background: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }
    .footer p { font-size: 14px; color: #64748b; margin: 5px 0; }
    .logo { width: 60px; height: 60px; margin: 0 auto 20px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">✨</div>
      <h1>You're Invited!</h1>
      <p>Join ${data.inviterName} on Sparq Connection</p>
    </div>
    
    <div class="content">
      <div class="invitation-box">
        <div class="invitation-message">
          <strong>${data.inviterName}</strong> (${data.inviterEmail}) wants to start building a stronger relationship with you using <strong>Sparq Connection</strong>.
        </div>
        
        <a href="${data.inviteLink}" class="cta-button">
          Accept Invitation
        </a>
        
        <div class="code-section">
          <p>Or enter this code manually:</p>
          <div class="invite-code">${data.inviteCode}</div>
        </div>
      </div>
      
      <div class="features">
        <div class="feature">
          <div class="feature-icon">💝</div>
          <div class="feature-text">
            <div class="feature-title">Daily Connection Rituals</div>
            <div class="feature-desc">Spend 5-8 minutes each day strengthening your bond with meaningful activities</div>
          </div>
        </div>
        
        <div class="feature">
          <div class="feature-icon">🎮</div>
          <div class="feature-text">
            <div class="feature-title">Fun Partner Games</div>
            <div class="feature-desc">Discover new things about each other through engaging couple games and quizzes</div>
          </div>
        </div>
        
        <div class="feature">
          <div class="feature-icon">📝</div>
          <div class="feature-text">
            <div class="feature-title">Private Couple Journal</div>
            <div class="feature-desc">Share thoughts, appreciations, and memories in your secure relationship space</div>
          </div>
        </div>
        
        <div class="feature">
          <div class="feature-icon">🏆</div>
          <div class="feature-text">
            <div class="feature-title">Relationship Streaks</div>
            <div class="feature-desc">Build lasting habits together and celebrate your consistency milestones</div>
          </div>
        </div>
      </div>
      
      <p style="text-align: center; color: #64748b; margin-top: 40px;">
        This invitation expires on <strong>${expiryDate}</strong>
      </p>
    </div>
    
    <div class="footer">
      <p><strong>Sparq Connection</strong></p>
      <p>Building stronger relationships, one day at a time</p>
      <p>This email was sent because ${data.inviterName} invited you to join their Sparq Connection.</p>
    </div>
  </div>
</body>
</html>`
  }

  private generateInviteEmailText(data: InviteEmailData): string {
    const expiryDate = new Date(data.expiresAt).toLocaleDateString()
    
    return `
You're Invited to Sparq Connection!

${data.inviterName} (${data.inviterEmail}) has invited you to join them on Sparq Connection - an app that helps couples build stronger relationships through daily 5-8 minute rituals.

Accept your invitation: ${data.inviteLink}

Or enter this code manually: ${data.inviteCode}

What you'll get:
• Daily Connection Rituals - Meaningful 5-8 minute activities to strengthen your bond
• Fun Partner Games - Discover new things about each other through engaging games
• Private Couple Journal - Share thoughts and memories in your secure space
• Relationship Streaks - Build lasting habits and celebrate milestones together

This invitation expires on ${expiryDate}.

---
Sparq Connection - Building stronger relationships, one day at a time
This email was sent because ${data.inviterName} invited you to join their Sparq Connection.
`
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Send appreciation email to partner
   */
  async sendAppreciationEmail({
    to,
    senderName,
    recipientName,
    message,
    emotionalTone = 'loving',
    deliveryId
  }: {
    to: string
    senderName: string
    recipientName: string
    message: string
    emotionalTone?: string
    deliveryId?: string
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const subject = this.getAppreciationSubject(emotionalTone, senderName)
      const htmlContent = this.generateAppreciationEmailHtml({
        to,
        senderName,
        recipientName,
        message,
        emotionalTone,
        deliveryId
      })

      const textContent = this.generateAppreciationEmailText({
        senderName,
        recipientName,
        message,
        emotionalTone
      })

      const msg = {
        to: to,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL!,
          name: 'Sparq Connection'
        },
        subject: subject,
        text: textContent,
        html: htmlContent,
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true }
        },
        customArgs: {
          delivery_id: deliveryId || '',
          email_type: 'appreciation',
          emotional_tone: emotionalTone
        }
      }

      const [response] = await this.sendgrid.send(msg)
      
      return {
        success: response.statusCode >= 200 && response.statusCode < 300,
        messageId: response.headers['x-message-id'] as string
      }
    } catch (error) {
      console.error('Error sending appreciation email:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private getAppreciationSubject(emotionalTone: string, senderName: string): string {
    const subjects = {
      loving: `💝 ${senderName} sent you a love note`,
      grateful: `🙏 ${senderName} wants to thank you`,
      playful: `😄 ${senderName} has something fun to share`,
      supportive: `🤗 ${senderName} is thinking of you`,
      proud: `🌟 ${senderName} is proud of you`,
      apologetic: `💔 A heartfelt message from ${senderName}`,
      encouraging: `✨ ${senderName} believes in you`
    }

    return subjects[emotionalTone as keyof typeof subjects] || `💌 A message from ${senderName}`
  }

  private generateAppreciationEmailHtml({
    to,
    senderName,
    recipientName,
    message,
    emotionalTone,
    deliveryId
  }: {
    to: string
    senderName: string
    recipientName: string
    message: string
    emotionalTone: string
    deliveryId?: string
  }): string {
    const emoji = this.getEmotionalEmoji(emotionalTone)
    const bgColor = this.getEmotionalColor(emotionalTone)
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Appreciation from ${senderName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, ${bgColor.primary}, ${bgColor.secondary}); color: white; text-align: center; padding: 40px 20px; }
    .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
    .header h1 { font-size: 28px; margin-bottom: 8px; }
    .header p { font-size: 16px; opacity: 0.9; }
    .content { padding: 40px 30px; }
    .greeting { font-size: 18px; color: #374151; margin-bottom: 20px; }
    .message-container { background-color: #f9f9ff; border-left: 4px solid ${bgColor.primary}; padding: 24px; margin: 24px 0; border-radius: 8px; }
    .message-content { font-size: 16px; line-height: 1.8; color: #1f2937; font-style: italic; }
    .sender-info { text-align: right; margin-top: 16px; color: #6b7280; font-size: 14px; }
    .cta-section { text-align: center; margin: 40px 0; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, ${bgColor.primary}, ${bgColor.secondary}); color: white; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); transition: transform 0.2s; }
    .cta-button:hover { transform: translateY(-2px); }
    .features { background-color: #fafafa; padding: 30px; margin: 30px 0; border-radius: 12px; }
    .feature { display: flex; align-items: center; margin-bottom: 16px; }
    .feature-icon { font-size: 20px; margin-right: 12px; width: 24px; }
    .feature-text { font-size: 14px; color: #4b5563; }
    .footer { background-color: #f1f5f9; padding: 30px; text-align: center; color: #64748b; font-size: 14px; border-top: 1px solid #e2e8f0; }
    .footer p { margin-bottom: 8px; }
    .footer strong { color: #1e293b; }
    @media (max-width: 600px) {
      .container { width: 100%; }
      .content, .features { padding: 20px; }
      .header { padding: 30px 20px; }
      .header h1 { font-size: 24px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">✨ Sparq Connection</div>
      <h1>${emoji} A Special Message</h1>
      <p>From your partner with love</p>
    </div>
    
    <div class="content">
      <div class="greeting">
        Hi ${recipientName},
      </div>
      
      <p style="color: #4b5563; margin-bottom: 20px;">
        ${senderName} wanted to share something special with you through Sparq Connection:
      </p>
      
      <div class="message-container">
        <div class="message-content">
          "${message}"
        </div>
        <div class="sender-info">
          — ${senderName}
        </div>
      </div>
      
      <div class="cta-section">
        <a href="${process.env.NEXT_PUBLIC_SITE_URL}/home?utm_source=appreciation&utm_campaign=partner_message" class="cta-button">
          💕 Respond to ${senderName}
        </a>
      </div>
      
      <div class="features">
        <h3 style="color: #1f2937; margin-bottom: 20px; text-align: center;">
          Keep building your connection together
        </h3>
        
        <div class="feature">
          <div class="feature-icon">🌱</div>
          <div class="feature-text">Daily 5-minute rituals to strengthen your bond</div>
        </div>
        
        <div class="feature">
          <div class="feature-icon">🎮</div>
          <div class="feature-text">Fun games to discover new things about each other</div>
        </div>
        
        <div class="feature">
          <div class="feature-icon">📝</div>
          <div class="feature-text">Private journal to capture your journey together</div>
        </div>
        
        <div class="feature">
          <div class="feature-icon">🔥</div>
          <div class="feature-text">Streak tracking to celebrate consistency</div>
        </div>
      </div>
      
      <p style="text-align: center; color: #64748b; font-size: 14px; margin-top: 30px;">
        This message was sent through Sparq Connection, your daily relationship ritual app.
      </p>
    </div>
    
    <div class="footer">
      <p><strong>Sparq Connection</strong></p>
      <p>Building stronger relationships, one day at a time</p>
      <p>You received this because you're connected to ${senderName} on Sparq Connection.</p>
      ${deliveryId ? `<p style="font-size: 12px; margin-top: 10px;">Message ID: ${deliveryId}</p>` : ''}
    </div>
  </div>
</body>
</html>`
  }

  private generateAppreciationEmailText({
    senderName,
    recipientName,
    message,
    emotionalTone
  }: {
    senderName: string
    recipientName: string
    message: string
    emotionalTone: string
  }): string {
    const emoji = this.getEmotionalEmoji(emotionalTone)
    
    return `
${emoji} A Special Message from ${senderName}

Hi ${recipientName},

${senderName} wanted to share something special with you through Sparq Connection:

"${message}"

— ${senderName}

Respond to ${senderName}: ${process.env.NEXT_PUBLIC_SITE_URL}/home

Keep building your connection together:
• Daily 5-minute rituals to strengthen your bond
• Fun games to discover new things about each other
• Private journal to capture your journey together
• Streak tracking to celebrate consistency

---
Sparq Connection - Building stronger relationships, one day at a time
You received this because you're connected to ${senderName} on Sparq Connection.
`
  }

  private getEmotionalEmoji(tone: string): string {
    const emojis = {
      loving: '💝',
      grateful: '🙏',
      playful: '😄',
      supportive: '🤗',
      proud: '🌟',
      apologetic: '💔',
      encouraging: '✨'
    }
    return emojis[tone as keyof typeof emojis] || '💌'
  }

  private getEmotionalColor(tone: string): { primary: string; secondary: string } {
    const colors = {
      loving: { primary: '#ec4899', secondary: '#f472b6' }, // Pink
      grateful: { primary: '#059669', secondary: '#34d399' }, // Green
      playful: { primary: '#f59e0b', secondary: '#fbbf24' }, // Orange
      supportive: { primary: '#3b82f6', secondary: '#60a5fa' }, // Blue
      proud: { primary: '#8b5cf6', secondary: '#a78bfa' }, // Purple
      apologetic: { primary: '#dc2626', secondary: '#f87171' }, // Red
      encouraging: { primary: '#06b6d4', secondary: '#22d3ee' }  // Cyan
    }
    return colors[tone as keyof typeof colors] || { primary: '#ec4899', secondary: '#f472b6' }
  }

  // Development helper - log emails instead of sending
  async mockSendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string }> {
    console.log('📧 Mock Email Send:')
    console.log(`To: ${options.to}${options.toName ? ` (${options.toName})` : ''}`)
    console.log(`Subject: ${options.subject}`)
    console.log(`HTML: ${options.html.substring(0, 200)}...`)
    
    return {
      success: true,
      messageId: `mock-${Date.now()}`
    }
  }
}

// Export singleton instance
export const emailService = new EmailService()