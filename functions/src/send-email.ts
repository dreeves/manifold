import * as mailgun from 'mailgun-js'
import * as functions from 'firebase-functions'

const DOMAIN = 'mg.manifold.markets'
const mg = mailgun({ apiKey: functions.config().mailgun.key, domain: DOMAIN })

export const sendTextEmail = (to: string, subject: string, text: string) => {
  const data: mailgun.messages.SendData = {
    from: 'Manifold Markets <info@manifold.markets>',
    to,
    subject,
    text,
    // Don't rewrite urls in plaintext emails
    'o:tracking-clicks': 'htmlonly',
  }

  return mg.messages().send(data, (error) => {
    if (error) console.log('Error sending email', error)
    else console.log('Sent text email', to, subject)
  })
}

export const sendTemplateEmail = (
  to: string,
  subject: string,
  templateId: string,
  templateData: Record<string, string>,
  options?: { from: string }
) => {
  const data = {
    from: options?.from ?? 'Manifold Markets <info@manifold.markets>',
    to,
    subject,
    template: templateId,
    'h:X-Mailgun-Variables': JSON.stringify(templateData),
  }
  return mg.messages().send(data, (error) => {
    if (error) console.log('Error sending email', error)
    else console.log('Sent template email', templateId, to, subject)
  })
}
