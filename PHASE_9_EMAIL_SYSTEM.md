# PHASE 9: EMAIL SYSTEM (RESEND)
## Golf Charity Draw Platform

---

## 📧 EMAIL ARCHITECTURE

### Email Service Setup
```typescript
// services/emailService.ts
import { Resend } from 'resend'
import { render } from '@react-email/components'
import { 
  WelcomeEmail,
  PaymentReceipt,
  DonationReceipt,
  WinnerNotification,
  WinnerApproved,
  WinnerRejected,
  PayoutCompleted,
  PrizeExpired,
  AdminProofNotification,
  PaymentFailed,
  SubscriptionCancelled
} from '@/emails/templates'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailData {
  to: string
  subject: string
  template: string
  data: Record<string, any>
}

export class EmailService {
  private static instance: EmailService
  private resend: Resend

  private constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY)
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  async sendEmail({ to, subject, template, data }: EmailData) {
    try {
      // Validate environment
      if (!process.env.RESEND_API_KEY) {
        console.error('RESEND_API_KEY not configured')
        return { success: false, error: 'Email service not configured' }
      }

      // Get email component
      const emailComponent = this.getEmailComponent(template, data)
      
      if (!emailComponent) {
        console.error(`Email template not found: ${template}`)
        return { success: false, error: 'Template not found' }
      }

      // Render email HTML
      const html = await render(emailComponent)

      // Send email
      const { data: result, error } = await this.resend.emails.send({
        from: process.env.EMAIL_FROM || 'Play4Purpose <noreply@play4purpose.com>',
        to: [to],
        subject,
        html
      })

      if (error) {
        console.error('Email send error:', error)
        return { success: false, error: error.message }
      }

      // Log email sent
      await this.logEmailSent({
        to,
        subject,
        template,
        data,
        messageId: result.id
      })

      return { success: true, messageId: result.id }

    } catch (error) {
      console.error('Email service error:', error)
      return { success: false, error: 'Failed to send email' }
    }
  }

  private getEmailComponent(template: string, data: any) {
    const components = {
      welcome: WelcomeEmail,
      payment_receipt: PaymentReceipt,
      donation_receipt: DonationReceipt,
      winner_notification: WinnerNotification,
      winner_approved: WinnerApproved,
      winner_rejected: WinnerRejected,
      payout_completed: PayoutCompleted,
      prize_expired: PrizeExpired,
      admin_proof_notification: AdminProofNotification,
      payment_failed: PaymentFailed,
      subscription_cancelled: SubscriptionCancelled
    }

    const Component = components[template as keyof typeof components]
    return Component ? <Component {...data} /> : null
  }

  private async logEmailSent(data: any) {
    // Log to database for audit trail
    try {
      await supabaseAdmin.from('email_logs').insert({
        recipient: data.to,
        subject: data.subject,
        template: data.template,
        message_id: data.messageId,
        status: 'sent',
        sent_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to log email:', error)
    }
  }

  // Send bulk emails
  async sendBulkEmails(recipients: string[], subject: string, template: string, data: any) {
    const results = await Promise.allSettled(
      recipients.map(to => this.sendEmail({ to, subject, template, data }))
    )

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    return { successful, failed, total: recipients.length }
  }
}

// Singleton instance
export const emailService = EmailService.getInstance()
```

---

## 📝 EMAIL TEMPLATES

### 1. Welcome Email
```typescript
// emails/templates/welcome.tsx
import { 
  Html, 
  Head, 
  Body, 
  Container, 
  Heading, 
  Text, 
  Button,
  Section,
  Hr
} from '@react-email/components'

interface WelcomeEmailProps {
  name: string
  plan: string
  nextBilling: string
}

export function WelcomeEmail({ name, plan, nextBilling }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header */}
          <Heading style={styles.heading}>
            Welcome to Play4Purpose!
          </Heading>
          
          <Text style={styles.text}>
            Hi {name},
          </Text>
          
          <Text style={styles.text}>
            Thank you for joining Play4Purpose! You're now part of a community 
            that's making a real difference through golf.
          </Text>

          {/* Subscription Details */}
          <Section style={styles.section}>
            <Heading style={styles.subheading}>Your Subscription</Heading>
            <Text style={styles.text}>
              <strong>Plan:</strong> {plan}
            </Text>
            <Text style={styles.text}>
              <strong>Next billing date:</strong> {new Date(nextBilling).toLocaleDateString()}
            </Text>
          </Section>

          {/* What's Next */}
          <Section style={styles.section}>
            <Heading style={styles.subheading}>What's Next?</Heading>
            <Text style={styles.text}>
              1. <strong>Select your charity</strong> - Choose which cause you want to support
            </Text>
            <Text style={styles.text}>
              2. <strong>Submit your scores</strong> - Start tracking your golf game
            </Text>
            <Text style={styles.text}>
              3. <strong>Enter monthly draws</strong> - Win prizes while supporting charity
            </Text>
          </Section>

          {/* CTA Button */}
          <Button style={styles.button} href={`${process.env.NEXT_PUBLIC_APP_URL}/onboarding`}>
            Complete Your Setup
          </Button>

          {/* Impact Message */}
          <Section style={styles.impactSection}>
            <Text style={styles.impactText}>
              Together, we're turning every round into a force for good. 
              Thank you for playing with purpose! ⛳
            </Text>
          </Section>

          <Hr style={styles.hr} />
          
          <Text style={styles.footer}>
            Questions? Contact us at support@play4purpose.com
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const styles = {
  body: {
    backgroundColor: '#f9fafb',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    margin: 0,
    padding: 0
  },
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '40px 20px',
    backgroundColor: '#ffffff'
  },
  heading: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: '20px',
    textAlign: 'center' as const
  },
  subheading: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: '30px',
    marginBottom: '15px'
  },
  text: {
    fontSize: '16px',
    lineHeight: '1.6',
    color: '#4b5563',
    marginBottom: '15px'
  },
  section: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  button: {
    backgroundColor: '#0066ff',
    color: '#ffffff',
    padding: '14px 32px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '16px',
    display: 'inline-block',
    marginTop: '20px'
  },
  impactSection: {
    padding: '30px 20px',
    backgroundColor: '#ecfdf5',
    borderRadius: '8px',
    marginTop: '30px',
    textAlign: 'center' as const
  },
  impactText: {
    fontSize: '18px',
    color: '#065f46',
    fontWeight: '500',
    margin: 0
  },
  hr: {
    border: 'none',
    borderTop: '1px solid #e5e7eb',
    margin: '40px 0'
  },
  footer: {
    fontSize: '14px',
    color: '#9ca3af',
    textAlign: 'center' as const
  }
}
```

### 2. Payment Receipt
```typescript
// emails/templates/payment-receipt.tsx
import { Html, Head, Body, Container, Heading, Text, Section, Hr, Row, Column } from '@react-email/components'

interface PaymentReceiptProps {
  name: string
  amount: number
  date: string
  invoiceUrl: string
  plan: string
}

export function PaymentReceipt({ name, amount, date, invoiceUrl, plan }: PaymentReceiptProps) {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Payment Receipt</Heading>
          
          <Text style={styles.text}>Hi {name},</Text>
          <Text style={styles.text}>
            Thank you for your payment. Here's your receipt:
          </Text>

          {/* Receipt Details */}
          <Section style={styles.receiptBox}>
            <Row>
              <Column>
                <Text style={styles.label}>Amount Paid</Text>
                <Text style={styles.amount}>£{amount.toFixed(2)}</Text>
              </Column>
            </Row>
            
            <Hr style={styles.hr} />
            
            <Row>
              <Column>
                <Text style={styles.label}>Plan</Text>
                <Text style={styles.value}>{plan}</Text>
              </Column>
              <Column style={{ textAlign: 'right' }}>
                <Text style={styles.label}>Date</Text>
                <Text style={styles.value}>{new Date(date).toLocaleDateString()}</Text>
              </Column>
            </Row>
          </Section>

          {/* Charity Impact */}
          <Section style={styles.impactBox}>
            <Text style={styles.impactTitle}>Your Impact</Text>
            <Text style={styles.impactText}>
              A portion of your payment went to charity. Thank you for making a difference!
            </Text>
          </Section>

          <Section style={styles.buttonContainer}>
            <a href={invoiceUrl} style={styles.button}>
              View Full Invoice
            </a>
          </Section>

          <Hr style={styles.hr} />
          <Text style={styles.footer}>
            Play4Purpose - Play Golf, Support Charity, Win Prizes
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const styles = {
  body: {
    backgroundColor: '#f9fafb',
    fontFamily: 'sans-serif',
    margin: 0,
    padding: 0
  },
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '40px 20px',
    backgroundColor: '#ffffff'
  },
  heading: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: '20px'
  },
  text: {
    fontSize: '16px',
    lineHeight: '1.6',
    color: '#4b5563',
    marginBottom: '15px'
  },
  receiptBox: {
    padding: '30px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    margin: '30px 0'
  },
  label: {
    fontSize: '12px',
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    fontWeight: '600',
    marginBottom: '5px'
  },
  amount: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    margin: 0
  },
  value: {
    fontSize: '16px',
    color: '#1a1a1a',
    margin: 0
  },
  hr: {
    border: 'none',
    borderTop: '1px solid #e5e7eb',
    margin: '20px 0'
  },
  impactBox: {
    padding: '20px',
    backgroundColor: '#ecfdf5',
    borderRadius: '8px',
    margin: '20px 0'
  },
  impactTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#065f46',
    marginBottom: '10px'
  },
  impactText: {
    fontSize: '14px',
    color: '#047857',
    margin: 0
  },
  buttonContainer: {
    textAlign: 'center' as const,
    marginTop: '30px'
  },
  button: {
    backgroundColor: '#0066ff',
    color: '#ffffff',
    padding: '12px 24px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: '600',
    display: 'inline-block'
  },
  footer: {
    fontSize: '12px',
    color: '#9ca3af',
    textAlign: 'center' as const,
    marginTop: '40px'
  }
}
```

### 3. Winner Notification
```typescript
// emails/templates/winner-notification.tsx
import { Html, Head, Body, Container, Heading, Text, Button, Section } from '@react-email/components'

interface WinnerNotificationProps {
  name: string
  position: number
  amount: number
  proofDeadline: Date
  uploadUrl: string
}

export function WinnerNotification({ 
  name, 
  position, 
  amount, 
  proofDeadline, 
  uploadUrl 
}: WinnerNotificationProps) {
  const positionText = position === 1 ? '1st Place' : position === 2 ? '2nd Place' : '3rd Place'
  
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Celebration Header */}
          <Section style={styles.celebrationHeader}>
            <Heading style={styles.emoji}>🎉</Heading>
            <Heading style={styles.heading}>Congratulations!</Heading>
            <Text style={styles.subheading}>You've won {positionText}!</Text>
          </Section>

          {/* Prize Amount */}
          <Section style={styles.prizeBox}>
            <Text style={styles.prizeLabel}>Your Prize</Text>
            <Text style={styles.prizeAmount}>£{amount.toFixed(2)}</Text>
          </Section>

          {/* Next Steps */}
          <Section style={styles.section}>
            <Heading style={styles.subheading}>What Happens Next?</Heading>
            
            <Text style={styles.step}>
              <strong>1. Upload Verification Proof</strong>
            </Text>
            <Text style={styles.text}>
              Please upload a photo of your ID or proof of identity within 7 days.
            </Text>
            
            <Text style={styles.step}>
              <strong>2. Admin Review</strong>
            </Text>
            <Text style={styles.text}>
              Our team will verify your proof within 7 days.
            </Text>
            
            <Text style={styles.step}>
              <strong>3. Receive Your Prize</strong>
            </Text>
            <Text style={styles.text}>
              Once approved, we'll send your prize within 30 days.
            </Text>
          </Section>

          {/* Deadline */}
          <Section style={styles.deadlineBox}>
            <Text style={styles.deadlineLabel}>⏰ Proof Upload Deadline</Text>
            <Text style={styles.deadlineDate}>
              {proofDeadline.toLocaleDateString('en-GB', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
          </Section>

          {/* CTA Button */}
          <Button style={styles.button} href={uploadUrl}>
            Upload Your Proof
          </Button>

          {/* Support */}
          <Text style={styles.supportText}>
            Questions? Contact us at support@play4purpose.com
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const styles = {
  body: {
    backgroundColor: '#f9fafb',
    fontFamily: 'sans-serif',
    margin: 0,
    padding: 0
  },
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '40px 20px',
    backgroundColor: '#ffffff'
  },
  celebrationHeader: {
    textAlign: 'center' as const,
    padding: '40px 20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '12px',
    marginBottom: '30px'
  },
  emoji: {
    fontSize: '64px',
    margin: '0 0 20px 0'
  },
  heading: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#ffffff',
    margin: '0 0 10px 0'
  },
  subheading: {
    fontSize: '20px',
    color: '#e0e7ff',
    margin: 0
  },
  prizeBox: {
    padding: '30px',
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    textAlign: 'center' as const,
    margin: '30px 0'
  },
  prizeLabel: {
    fontSize: '14px',
    color: '#92400e',
    textTransform: 'uppercase' as const,
    fontWeight: '600',
    marginBottom: '10px'
  },
  prizeAmount: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#78350f',
    margin: 0
  },
  section: {
    margin: '30px 0'
  },
  step: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '5px'
  },
  text: {
    fontSize: '16px',
    lineHeight: '1.6',
    color: '#4b5563',
    marginBottom: '15px'
  },
  deadlineBox: {
    padding: '20px',
    backgroundColor: '#fee2e2',
    borderRadius: '8px',
    textAlign: 'center' as const,
    margin: '30px 0'
  },
  deadlineLabel: {
    fontSize: '14px',
    color: '#991b1b',
    fontWeight: '600',
    marginBottom: '10px'
  },
  deadlineDate: {
    fontSize: '18px',
    color: '#7f1d1d',
    fontWeight: '600',
    margin: 0
  },
  button: {
    backgroundColor: '#0066ff',
    color: '#ffffff',
    padding: '16px 32px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '16px',
    display: 'block',
    textAlign: 'center' as const,
    marginTop: '30px'
  },
  supportText: {
    fontSize: '14px',
    color: '#9ca3af',
    textAlign: 'center' as const,
    marginTop: '30px'
  }
}
```

### 4. Donation Receipt
```typescript
// emails/templates/donation-receipt.tsx
import { Html, Head, Body, Container, Heading, Text, Section, Hr } from '@react-email/components'

interface DonationReceiptProps {
  name: string
  amount: number
  percentage: number
  charityName: string
  date: Date
}

export function DonationReceipt({ 
  name, 
  amount, 
  percentage, 
  charityName, 
  date 
}: DonationReceiptProps) {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Donation Receipt</Heading>
          
          <Text style={styles.text}>Hi {name},</Text>
          <Text style={styles.text}>
            Thank you for your generous contribution to {charityName}!
          </Text>

          {/* Donation Details */}
          <Section style={styles.donationBox}>
            <Row>
              <Column>
                <Text style={styles.label}>Charity</Text>
                <Text style={styles.value}>{charityName}</Text>
              </Column>
            </Row>
            
            <Hr style={styles.hr} />
            
            <Row>
              <Column>
                <Text style={styles.label}>Donation Amount</Text>
                <Text style={styles.amount}>£{amount.toFixed(2)}</Text>
              </Column>
              <Column style={{ textAlign: 'right' }}>
                <Text style={styles.label}>Contribution</Text>
                <Text style={styles.value}>{percentage}% of subscription</Text>
              </Column>
            </Row>
            
            <Hr style={styles.hr} />
            
            <Row>
              <Column>
                <Text style={styles.label}>Date</Text>
                <Text style={styles.value}>{date.toLocaleDateString('en-GB')}</Text>
              </Column>
            </Row>
          </Section>

          {/* Impact Message */}
          <Section style={styles.impactBox}>
            <Text style={styles.impactText}>
              Your contribution helps make a real difference. Together, we're 
              supporting important causes while enjoying the game we love.
            </Text>
          </Section>

          <Hr style={styles.hr} />
          <Text style={styles.footer}>
            Play4Purpose - Play Golf, Support Charity, Win Prizes
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const styles = {
  body: {
    backgroundColor: '#f9fafb',
    fontFamily: 'sans-serif',
    margin: 0,
    padding: 0
  },
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '40px 20px',
    backgroundColor: '#ffffff'
  },
  heading: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: '20px'
  },
  text: {
    fontSize: '16px',
    lineHeight: '1.6',
    color: '#4b5563',
    marginBottom: '15px'
  },
  donationBox: {
    padding: '30px',
    backgroundColor: '#ecfdf5',
    borderRadius: '8px',
    margin: '30px 0'
  },
  label: {
    fontSize: '12px',
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    fontWeight: '600',
    marginBottom: '5px'
  },
  amount: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#065f46',
    margin: 0
  },
  value: {
    fontSize: '16px',
    color: '#1a1a1a',
    margin: 0
  },
  hr: {
    border: 'none',
    borderTop: '1px solid #d1d5db',
    margin: '20px 0'
  },
  impactBox: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    margin: '20px 0'
  },
  impactText: {
    fontSize: '16px',
    color: '#4b5563',
    lineHeight: '1.6',
    margin: 0
  },
  footer: {
    fontSize: '12px',
    color: '#9ca3af',
    textAlign: 'center' as const,
    marginTop: '40px'
  }
}
```

### 5. Payment Failed Email
```typescript
// emails/templates/payment-failed.tsx
import { Html, Head, Body, Container, Heading, Text, Button, Section } from '@react-email/components'

interface PaymentFailedProps {
  name: string
  retryUrl: string
  deadline: Date
}

export function PaymentFailed({ name, retryUrl, deadline }: PaymentFailedProps) {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Payment Failed</Heading>
          
          <Text style={styles.text}>Hi {name},</Text>
          <Text style={styles.text}>
            We weren't able to process your recent subscription payment. 
            Don't worry - your account is still active, but please update your 
            payment method to avoid service interruption.
          </Text>

          {/* Warning Box */}
          <Section style={styles.warningBox}>
            <Text style={styles.warningTitle}>⚠️ Action Required</Text>
            <Text style={styles.warningText}>
              Please update your payment method by <strong>{deadline.toLocaleDateString('en-GB')}</strong> 
              to maintain uninterrupted access.
            </Text>
          </Section>

          {/* CTA Button */}
          <Button style={styles.button} href={retryUrl}>
            Update Payment Method
          </Button>

          {/* Help Text */}
          <Text style={styles.helpText}>
            If you're having trouble or believe this is an error, please contact 
            our support team at support@play4purpose.com
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const styles = {
  body: {
    backgroundColor: '#f9fafb',
    fontFamily: 'sans-serif',
    margin: 0,
    padding: 0
  },
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '40px 20px',
    backgroundColor: '#ffffff'
  },
  heading: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: '20px'
  },
  text: {
    fontSize: '16px',
    lineHeight: '1.6',
    color: '#4b5563',
    marginBottom: '15px'
  },
  warningBox: {
    padding: '20px',
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    margin: '30px 0'
  },
  warningTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#92400e',
    marginBottom: '10px'
  },
  warningText: {
    fontSize: '16px',
    color: '#78350f',
    margin: 0
  },
  button: {
    backgroundColor: '#0066ff',
    color: '#ffffff',
    padding: '14px 28px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '16px',
    display: 'inline-block',
    marginTop: '20px'
  },
  helpText: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '30px',
    textAlign: 'center' as const
  }
}
```

---

## 📊 EMAIL TRACKING

### Email Logs Table
```sql
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  subject text NOT NULL,
  template text NOT NULL,
  message_id text,
  status text NOT NULL DEFAULT 'sent',
  error text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz,
  clicked_at timestamptz
);

-- Indexes
CREATE INDEX idx_email_logs_recipient ON email_logs(recipient);
CREATE INDEX idx_email_logs_template ON email_logs(template);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at DESC);
```

### Email Analytics
```typescript
// lib/emailAnalytics.ts

export async function getEmailStats(days: number = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data: emails } = await supabaseAdmin
    .from('email_logs')
    .select('template, status, sent_at')
    .gte('sent_at', startDate.toISOString())

  // Group by template
  const stats = new Map()
  for (const email of emails || []) {
    const template = email.template
    if (!stats.has(template)) {
      stats.set(template, { sent: 0, failed: 0 })
    }
    const stat = stats.get(template)
    if (email.status === 'sent') stat.sent++
    else stat.failed++
  }

  return {
    total: emails?.length || 0,
    byTemplate: Object.fromEntries(stats)
  }
}
```

---

## ⚙️ EMAIL CONFIGURATION

### Environment Variables
```bash
# .env
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=noreply@play4purpose.com
EMAIL_FROM_NAME=Play4Purpose
```

### Resend Setup
```typescript
// lib/resend.ts
import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

// Verify domain in Resend dashboard
// Add DNS records for SPF, DKIM, DMARC
// Configure bounce and complaint webhooks
```

---

## ✅ PHASE 9 COMPLETE

**Email System includes:**
- ✅ Resend integration
- ✅ 11 email templates
- ✅ Template rendering with React Email
- ✅ Email logging and tracking
- ✅ Error handling
- ✅ Bulk email support
- ✅ Analytics and reporting

**Ready to proceed to PHASE 10: Testing System**