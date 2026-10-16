import React, { useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

interface PrivacyPolicyPageProps {
  onNavigateHome?: () => void;
  onNavigateToTerms?: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({
  onNavigateHome,
  onNavigateToTerms,
}) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const sections = [
    {
      title: 'Zero-Knowledge Cryptography & Device-Side Encryption',
      content: [
        'At Red Apple Health Inc., your reproductive, fertility, and maternal healthcare data is treated as an inviolable personal sanctuary. We have architected our platform using zero-knowledge client-side encryption. When you log cycle dates, ovulation symptoms, diagnostic lab values, or pregnancy notes, those records are encrypted on your local mobile device before transmission to our servers.',
        'Because cryptographic private keys remain exclusively stored on your personal device, no third party—including Red Apple software engineers, cloud infrastructure providers, and database administrators—possesses the mathematical ability to decrypt or view your intimate health records.',
      ],
    },
    {
      title: 'Information We Collect',
      content: [
        'We collect only the minimum necessary data required to deliver menstrual forecasts, maternal risk assessments, and telemedicine consults: (a) Basic Account Information such as verified email address or phone number; (b) User-Submitted Health Logs including cycle dates, ovulation symptoms, diagnostic vitals, and gestational notes; (c) Telemedicine Session Metadata including appointment timestamps and verified clinician license numbers.',
        'We do not collect background geolocation tracking, personal contact books, microphone recordings outside active telemedicine video sessions, or any biometric parameters not explicitly entered by you.',
      ],
    },
    {
      title: 'Strict Purpose Limitations & How We Use Clinical Data',
      content: [
        'Your health information is strictly processed to: calculate personalized fertility and maternal health windows; facilitate secure, encrypted video or chat triage sessions with certified OB-GYNs; alert frontline midwives to high-risk maternal warning signs; and generate anonymized, aggregated maternal epidemiology metrics to help public clinics allocate emergency resources.',
        'Under no circumstances do we ever sell, rent, or trade individual health records or contact details to data brokers, pharmaceutical advertisers, or insurance underwriters.',
      ],
    },
    {
      title: 'Telemedicine & Clinical Confidentiality',
      content: [
        'Consultations conducted via Red Apple Telehealth are private clinician-patient communications protected under statutory medical confidentiality. Licensed OB-GYNs and clinicians are bound by the Medical and Dental Council of Nigeria (MDCN) Code of Conduct or their applicable national medical regulatory bodies.',
        'Clinical notes authored by your physician during a consult are stored in an encrypted electronic medical record (EMR) accessible solely by you and authorized healthcare providers involved in your direct care.',
      ],
    },
    {
      title: 'Absolute Prohibition on Third-Party Data Brokering or Ad-Tracking',
      content: [
        'We enforce a 100% strict prohibition on third-party commercial data brokering or targeted advertising tracking. We do not integrate surveillance advertising SDKs or third-party behavioral analytics trackers into the Red Apple mobile applications.',
        'Your intimate health data will never be monetized, packaged into algorithmic marketing profiles, or utilized to influence commercial purchasing behavior.',
      ],
    },
    {
      title: 'Your Data Rights, Portability & Self-Serve Deletion',
      content: [
        'You retain total ownership over your health information. Through the Red Apple application or by contacting our Data Protection Officer, you have the right to: request a complete JSON or PDF export of your clinical logs; correct inaccurate medical metrics; revoke consent for non-essential telemetry; or permanently purge your account and cryptographic keys.',
        'Upon account termination, your data is irrevocably expunged from primary production storage within 48 hours and purged from encrypted backup cycles within 30 days.',
      ],
    },
    {
      title: 'Protection of Minors & Maternal Autonomy',
      content: [
        'The Services are not directed to unsupervised children under the age of 13. When adolescent mothers access Red Apple maternal support in healthcare settings, frontline community midwives and healthcare workers ensure that informed consent protocols are respected in accordance with maternal health protection guidelines.',
      ],
    },
    {
      title: 'Regulatory Compliance & Contacting Our DPO',
      content: [
        'Red Apple operates under strict compliance with the Nigeria Data Protection Act (NDPA), General Data Protection Regulation (GDPR) standards, and international medical confidentiality frameworks.',
        'If you have questions regarding this Privacy Policy, wish to exercise statutory data rights, or suspect an unauthorized access attempt, contact our designated Data Protection Officer at privacy@redapplehealth.com or write to: Data Protection Officer, Red Apple Health Inc., Lagos & Kigali.',
      ],
    },
  ];

  return (
    <div className="w-full min-h-screen bg-[#EDEDED] text-[#0F0F0F] font-diegrotesk selection:bg-neutral-200 overflow-x-hidden">
      {/* Floating Navbar */}
      <Navbar brandName="RED APPLE" />

      {/* Main Butter-Style Page Canvas with 6rem rounded bottom overlapping the dark footer */}
      <div className="relative bg-[#FAFAFA] rounded-b-[40px] sm:rounded-b-[60px] lg:rounded-b-[80px] z-10 shadow-xs">
        <section className="w-full max-w-[1480px] mx-auto px-6 sm:px-10 lg:px-16 xl:px-20 pt-32 sm:pt-40 lg:pt-48 pb-24 sm:pb-32 lg:pb-40">
          
          {/* Butter 12-Column Responsive Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">

            {/* LEFT COLUMN: Date, Title & Navigation Switcher (Sticky on Desktop) */}
            <div className="lg:col-span-4 lg:sticky lg:top-36 self-start space-y-6">
              
              {/* Date in Butter Diatype */}
              <p className="font-diatype text-xs sm:text-[13px] tracking-[0.04em] uppercase text-[rgba(15,15,15,0.4)]">
                08/19/2026
              </p>

              {/* Title in Butter DieGrotesk */}
              <h1 className="font-diegrotesk font-normal text-3xl sm:text-4xl lg:text-[44px] xl:text-[50px] leading-[0.96] tracking-[0.008em] text-[#0F0F0F]">
                Red Apple Health Inc. Privacy Policy
              </h1>

              {/* Butter-Style Document Switcher & Navigation */}
              <div className="pt-6 sm:pt-8 border-t border-[rgba(15,15,15,0.12)] space-y-4">
                <p className="font-diatype text-[11px] uppercase tracking-[0.06em] text-[rgba(15,15,15,0.4)] font-medium">
                  Legal &amp; Regulatory
                </p>

                <div className="flex flex-col space-y-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigateToTerms) onNavigateToTerms();
                    }}
                    className="text-left font-diegrotesk text-[16px] text-[rgba(15,15,15,0.45)] hover:text-[#0F0F0F] hover:pl-2 transition-all duration-200 cursor-pointer"
                  >
                    Terms of Service
                  </button>

                  <div className="font-diegrotesk text-[16px] text-[#0F0F0F] font-medium pl-3 border-l-2 border-[#0F0F0F]">
                    Privacy Policy
                  </div>

                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new Event('open-cookie-settings'))}
                    className="text-left font-diegrotesk text-[16px] text-[rgba(15,15,15,0.45)] hover:text-[#0F0F0F] hover:pl-2 transition-all duration-200 cursor-pointer"
                  >
                    Cookie Preferences
                  </button>
                </div>
              </div>

              {/* Back to Home Button */}
              <div className="pt-6">
                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="group inline-flex items-center gap-2 font-diegrotesk text-[15px] text-[rgba(15,15,15,0.5)] hover:text-[#0F0F0F] transition-colors cursor-pointer select-none"
                >
                  <span className="font-diatype transition-transform duration-200 group-hover:-translate-x-1">←</span>
                  <span>Back to Home</span>
                </button>
              </div>

            </div>

            {/* RIGHT COLUMN: Content Stream (7 Columns on Desktop) */}
            <div className="lg:col-start-6 lg:col-span-7 space-y-10">

              {/* Lead Paragraph with Top Divider */}
              <div className="border-t border-[rgba(15,15,15,0.15)] pt-6 sm:pt-8 space-y-4">
                <p className="font-diegrotesk text-[19px] sm:text-[21px] leading-[1.5] tracking-[0.033em] text-[#1E1E1E]">
                  At Red Apple Health Inc. (“Red Apple”, “we”, “our”, or “us”), we believe reproductive and maternal healthcare data is an inviolable personal sanctuary. This Privacy Policy describes how we collect, process, encrypt, and safeguard your personal health information across the Red Apple mobile applications, clinical portals, and telemedicine networks.
                </p>
              </div>

              {/* Zero-Knowledge Privacy Guarantee Callout Box (Butter style) */}
              <div className="p-6 sm:p-7 rounded-2xl bg-[#F2F2F2] border border-[rgba(15,15,15,0.08)] space-y-3">
                <p className="font-diatype text-[11px] uppercase tracking-wider text-[rgba(15,15,15,0.5)] font-semibold">
                  ZERO-KNOWLEDGE ARCHITECTURE GUARANTEE
                </p>
                <p className="font-diegrotesk text-[13px] sm:text-[14px] leading-[1.55] tracking-[0.025em] text-[#2C2C2C]">
                  YOUR INTIMATE CYCLE LOGS, SYMPTOM RECORDS, AND CLINICAL NOTES ARE CRYPTOGRAPHICALLY ENCRYPTED ON YOUR LOCAL DEVICE BEFORE TRANSMISSION. NEITHER RED APPLE ENGINEERS NOR DATABASE ADMINISTRATORS HOLD THE DECRYPTION KEYS TO YOUR PRIVATE MEDICAL DATA.
                </p>
              </div>

              {/* Sub-intro text */}
              <p className="font-diegrotesk text-[18px] sm:text-[20px] leading-[1.5] tracking-[0.033em] text-[#1E1E1E]">
                If you create an account, log clinical records, or consult with doctors on Red Apple, you entrust us with sensitive parameters. We believe privacy is a fundamental human right, and we design every system to ensure that you remain the sole owner of your medical records.
              </p>

              {/* Document Sections Separated by Clean Lines */}
              <div className="space-y-10 pt-4">
                {sections.map((section, idx) => (
                  <div
                    key={idx}
                    className="border-t border-[rgba(15,15,15,0.15)] pt-6 sm:pt-8 space-y-4"
                  >
                    <h2 className="font-diegrotesk font-normal text-[22px] sm:text-[25px] leading-[1.2] text-[#0F0F0F] tracking-[0.02em]">
                      {section.title}
                    </h2>

                    <div className="space-y-4">
                      {section.content.map((paragraph, pIdx) => (
                        <p
                          key={pIdx}
                          className="font-diegrotesk text-[17px] sm:text-[19px] leading-[1.55] tracking-[0.025em] text-[#2A2A2A]"
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Closing Legal Attribution */}
              <div className="border-t border-[rgba(15,15,15,0.15)] pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[13px] font-diatype text-[rgba(15,15,15,0.4)] uppercase tracking-wider">
                <span>Red Apple Health Inc. // Data Protection Directorate</span>
                <span>Document ID: RA-PRIV-2026</span>
              </div>

            </div>

          </div>

        </section>
      </div>

      {/* Global Footer */}
      <Footer />
    </div>
  );
};
