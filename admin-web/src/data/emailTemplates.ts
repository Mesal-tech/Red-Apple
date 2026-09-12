import type { EmailTemplate } from '../types/email';

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'welcome-member',
    name: 'Welcome to Red Apple',
    category: 'onboarding',
    description: 'Onboarding welcome email for newly registered women and patients.',
    subject: 'Welcome to Red Apple — Your Personal Health & Fertility Companion',
    html: '',
    simpleData: {
      recipient: '',
      subject: 'Welcome to Red Apple — Your Personal Health & Fertility Companion',
      headline: 'Welcome to your health journey, {{name}}! 👋',
      message: `We are thrilled to welcome you to Red Apple. Our mission is to put world-class fertility insights, cycle tracking, pregnancy care, and telemedicine consultations directly at your fingertips.

Here is what you can do right away:
- Log your latest cycle for accurate fertility and ovulation forecasts
- Book virtual appointments with verified gynecologists and specialists
- Access our medically-reviewed wellness guides and nutrition plans

Whenever you need help or have questions regarding your care, our team is always just a message away.`,
      signoff: 'Warm regards,\nThe Red Apple Team',
    },
  },
  {
    id: 'telemedicine-confirmation',
    name: 'Appointment Confirmation',
    category: 'clinical',
    description: 'Direct consultation confirmation with doctor, time, and session link.',
    subject: 'Confirmed: Virtual Consultation with Dr. {{doctor_name}}',
    html: '',
    simpleData: {
      recipient: '',
      subject: 'Confirmed: Virtual Consultation with Dr. {{doctor_name}}',
      headline: 'Your Video Consultation is Confirmed',
      message: `Hi {{name}}, your appointment with Dr. {{doctor_name}} has been scheduled and confirmed.

Session Details:
- Specialist: Dr. {{doctor_name}} ({{specialty}})
- Date & Time: {{appointment_date}} at {{appointment_time}}
- Booking Reference: #{{booking_reference}}

Please ensure you have a stable internet connection and find a quiet, private space. You can enter the consultation room 5 minutes before your session begins.

Need to reschedule? You can reschedule directly inside the Red Apple app up to 2 hours before your appointment.`,
      signoff: 'Dr. {{doctor_name}} & The Red Apple Medical Team',
    },
  },
  {
    id: 'health-educational-tip',
    name: 'Fertility & Health Tip Digest',
    category: 'educational',
    description: 'Weekly educational newsletter with fertility insights and lifestyle guidance.',
    subject: 'Health Tip: Understanding Your Cycle Phases & Nutrition',
    html: '',
    simpleData: {
      recipient: '',
      subject: 'Health Tip: Understanding Your Cycle Phases & Nutrition',
      headline: 'Understanding the 3 Phases of Your Cycle',
      message: `Hello {{name}}, our medical advisory team prepared this quick guide to help you understand how hormone fluctuations affect your energy, mood, and fertile window each month.

Key Health Insight:
During the follicular phase, rising estrogen enhances insulin sensitivity and focus. Prioritize wholesome fiber, nutrient-rich foods, and light strength training during this window.`,
      signoff: 'Reviewed by Dr. Ifeoma Okafor, OB-GYN\nRed Apple Medical Advisory Board',
    },
  },
  {
    id: 'system-announcement',
    name: 'Important Platform Notice',
    category: 'broadcast',
    description: 'System maintenance, terms update, or critical security notification.',
    subject: 'Notice: Important Updates to Red Apple Platform',
    html: '',
    simpleData: {
      recipient: '',
      subject: 'Notice: Important Updates to Red Apple Platform',
      headline: 'Scheduled System Maintenance',
      message: `Dear {{name}},

We are writing to inform you of scheduled infrastructure maintenance to ensure our telemedicine video connections remain fast and reliable across Nigeria.

Scheduled Maintenance Window:
Sunday 2:00 AM – 4:00 AM WAT. Offline cycle logging remains fully functional. Telemedicine booking will be briefly paused during this window.`,
      signoff: 'Red Apple Operations & Compliance Team',
    },
  },
  {
    id: 'blank-minimal',
    name: 'Write from Scratch (Blank)',
    category: 'custom',
    description: 'A clean canvas with Red Apple branding for any custom email.',
    subject: 'A message from Red Apple Health',
    html: '',
    simpleData: {
      recipient: '',
      subject: 'A message from Red Apple Health',
      headline: 'Hello from Red Apple',
      message: `Hi {{name}},

Type your message here. Write your paragraphs naturally without worrying about code or formatting.`,
      signoff: 'Warm regards,\nThe Red Apple Team',
    },
  },
];
