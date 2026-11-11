import { Resend } from 'resend';

const resend = new Resend('re_3JDNyBfy_UqDkhw1bVQgXPrZa1iDDUX7f');

resend.emails.send({
  from: 'onboarding@resend.dev',
  to: 'sreyeszorrilla@gmail.com',
  subject: 'Hello World',
  html: '<p>Congrats on sending your <strong>first email</strong>!</p>'
});