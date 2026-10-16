import React, { useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

interface TermsOfUsePageProps {
  onNavigateHome?: () => void;
  onNavigateToPrivacy?: () => void;
}

export const TermsOfUsePage: React.FC<TermsOfUsePageProps> = ({
  onNavigateHome,
  onNavigateToPrivacy,
}) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const sections = [
    {
      title: 'Customers, Authorized Users, and Customer Content',
      content: [
        '“Customer” or “you” is either you, if you are an individual accessing Red Apple on your own behalf, or the organization (such as a health center, clinic network, or NGO) that you represent in agreeing to this Agreement. If your clinic workspace or team account is being set up by an administrator, the authorized health organization is the Customer. By signing up or registering on behalf of a healthcare institution or clinic, you represent and warrant that you possess all requisite legal authority to bind such entity to this Agreement.',
        'Individuals authorized by Customer to access the Services (each an “Authorized User”, including patients, midwives, and clinicians) may submit health metrics, symptoms, medical queries, biometric readings, diagnostic lab attachments, and profile information (collectively, “Customer Content”). Customer has the sole right and responsibility for managing the accuracy and lawful authorization of its submitted information. The Services are not intended for and should not be accessed by unsupervised children under the age of 13.',
        'Customer will: (a) inform Authorized Users of all applicable clinical and platform policies; (b) obtain all necessary patient informed consents required under applicable healthcare and medical confidentiality laws; and (c) ensure that health records are maintained in compliance with local medical privacy mandates.',
      ],
    },
    {
      title: 'Medical Disclaimer & Urgent Emergency Protocols',
      content: [
        'RED APPLE PROVIDES DIGITAL SYMPTOM TRIAGE, REPRODUCTIVE HEALTH FORECASTING, AND DIRECT ACCESS TO CERTIFIED CLINICIANS. ALL EDUCATIONAL CONTENT, STATISTICAL RISK SCORES, AND AUTOMATED OBSERVATIONS ARE DESIGNED TO AUGMENT—NOT REPLACE—DIRECT CLINICAL CONSULTATION WITH LICENSED MEDICAL PHYSICIANS.',
        'ACUTE MEDICAL CRISIS DISCLAIMER: RED APPLE IS NOT AN EMERGENCY DISPATCH SYSTEM. IF YOU OR SOMEONE IN YOUR CARE EXPERIENCES SUDDEN OBSTETRIC COMPLICATIONS, SEVERE UNCONTROLLED BLEEDING, ECLAMPSIA SYMPTOMS, INTENSE ABDOMINAL PAIN, LOSS OF CONSCIOUSNESS, OR ACUTE FETAL DISTRESS, DO NOT RELY ON IN-APP MESSAGING OR VIDEO APPOINTMENTS. PROCEED IMMEDIATELY TO THE NEAREST HOSPITAL EMERGENCY UNIT OR CONTACT YOUR LOCAL EMERGENCY SERVICES DISPATCH.',
      ],
    },
    {
      title: 'Telemedicine Consultations & Verified Healthcare Practitioners',
      content: [
        'Telemedicine visits facilitated through Red Apple connect users with independent, verified OB-GYNs, licensed midwives, and certified medical practitioners. Every healthcare professional listed on our platform is verified through active licensure registries with the Medical and Dental Council of Nigeria (MDCN) or the relevant national health professional council in their operating territory.',
        'During an active consultation, the attending clinician exercises sole independent clinical judgment. Red Apple does not dictate diagnostic prescriptions or clinical care decisions made by verified practitioners.',
        'Users agree to provide complete, truthful, and accurate medical and pharmacological history during telehealth sessions. Clinicians reserve the professional prerogative to refer patients to physical clinical facilities whenever an in-person physical examination or emergency intervention is warranted.',
      ],
    },
    {
      title: 'Subscription Plans & Account Security',
      content: [
        'Subscriptions to premium health tracking features, continuous specialist messaging, or enterprise clinic tier accounts commence upon verification and continue for the duration selected during enrollment. Subscriptions automatically renew for recurring billing cycles unless canceled at least 24 hours prior to the renewal date.',
        'You are exclusively responsible for safeguarding the credentials, passcodes, and biometrics used to unlock your Red Apple account on personal mobile devices. You must notify us immediately at security@redapplehealth.com if you suspect unauthorized access or compromised device security.',
      ],
    },
    {
      title: 'Community Midwives & Frontline Clinic Usage',
      content: [
        'Healthcare workers and community midwives using Red Apple OS or Connect in rural health centers agree to follow official maternal triage checklists and protocol guidelines. Patient records entered on behalf of community mothers must be handled with strict professional confidentiality.',
        'Offline triage data must be synchronized with regional cloud endpoints as soon as network connectivity is reestablished to guarantee continuity of clinical care.',
      ],
    },
    {
      title: 'Feedback & Clinical Intelligence Improvements',
      content: [
        'Users and healthcare practitioners may submit feedback, operational notes, or suggestions regarding platform usability (“Ideas”). By submitting Ideas, you grant Red Apple an unrestricted, royalty-free, perpetual right to utilize such suggestions to enhance user experience, clinical algorithms, and digital workflows without obligation of compensation.',
      ],
    },
    {
      title: 'Representations; Disclaimer of Warranties',
      content: [
        'EXCEPT AS EXPRESSLY PROVIDED IN THESE TERMS, THE SERVICES, PLATFORM ARCHITECTURE, AND ALL RELATED FEATURES ARE PROVIDED ON AN “AS IS” AND “AS AVAILABLE” BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, STATUTORY, OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR UNINTERRUPTED AVAILABILITY.',
      ],
    },
    {
      title: 'Limitation of Liability',
      content: [
        'TO THE MAXIMUM EXTENT PERMITTED UNDER APPLICABLE LAW, IN NO EVENT WILL RED APPLE HEALTH INC., ITS OFFICERS, DIRECTORS, EMPLOYEES, OR CLINICAL ADVISORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, GOODWILL, OR DELAYS IN ACCESSING THIRD-PARTY IN-PERSON MEDICAL CARE.',
        'EXCEPT FOR GROSS NEGLIGENCE OR WILLFUL MISCONDUCT, IN NO EVENT WILL RED APPLE’S TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO THIS AGREEMENT EXCEED THE TOTAL FEES PAID BY CUSTOMER TO RED APPLE IN THE TWELVE (12) MONTHS PRECEDING THE INCIDENT GIVING RISE TO LIABILITY.',
      ],
    },
    {
      title: 'Indemnification',
      content: [
        'Customer agrees to defend, indemnify, and hold harmless Red Apple and its affiliates from and against any third-party claims, liabilities, damages, and expenses (including reasonable legal fees) arising from: (a) breach of this Agreement; (b) misuse of the platform; or (c) failure to obtain required informed consents from patients or personnel.',
      ],
    },
    {
      title: 'Governing Law and Dispute Resolution',
      content: [
        'This Agreement and any dispute or controversy arising out of or related to it will be governed exclusively by the laws of the Federal Republic of Nigeria, without regard to conflicts of law principles. Any dispute that cannot be resolved amicably through good-faith mediation within thirty (30) days will be submitted to final and binding arbitration in Lagos under the Arbitration and Mediation Act.',
      ],
    },
    {
      title: 'Miscellaneous & Contacting Us',
      content: [
        'Force Majeure: Neither party will be held liable for delays or failure in performance resulting from acts of God, telecommunication grid outages, government sanctions, or events beyond reasonable operational control.',
        'Severability: If any provision of these Terms is deemed invalid or unenforceable, that provision will be limited or eliminated to the minimum extent necessary so that this Agreement remains in full force and effect.',
        'Contacting Us: For legal inquiries, formal notices, or questions regarding these Terms, contact our legal counsel at legal@redapplehealth.com or write to: Legal & Regulatory Directorate, Red Apple Health Inc., Lagos & Kigali.',
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
                Red Apple Health Inc. Terms of Service
              </h1>

              {/* Butter-Style Document Switcher & Navigation */}
              <div className="pt-6 sm:pt-8 border-t border-[rgba(15,15,15,0.12)] space-y-4">
                <p className="font-diatype text-[11px] uppercase tracking-[0.06em] text-[rgba(15,15,15,0.4)] font-medium">
                  Legal &amp; Regulatory
                </p>

                <div className="flex flex-col space-y-2.5">
                  <div className="font-diegrotesk text-[16px] text-[#0F0F0F] font-medium pl-3 border-l-2 border-[#0F0F0F]">
                    Terms of Service
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigateToPrivacy) onNavigateToPrivacy();
                    }}
                    className="text-left font-diegrotesk text-[16px] text-[rgba(15,15,15,0.45)] hover:text-[#0F0F0F] hover:pl-2 transition-all duration-200 cursor-pointer"
                  >
                    Privacy Policy
                  </button>

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
                  These Terms of Service (these “Terms”) describe your rights and responsibilities when using the mobile and/or web-based software platform, application programming interface, maternal symptom triage algorithms, telemedicine network, and associated clinical services (the “Services”) offered by Red Apple Health Inc. (“Red Apple”, “we”, “our”, or “us”). If you are a Customer, Patient, or Clinician, these Terms govern your access and use of our Services. These Terms, together with all documents referenced herein, form the “Agreement” between the Customer and us.
                </p>
              </div>

              {/* Important Medical & Arbitration Notice Callout Box (Butter style) */}
              <div className="p-6 sm:p-7 rounded-2xl bg-[#F2F2F2] border border-[rgba(15,15,15,0.08)] space-y-3">
                <p className="font-diatype text-[11px] uppercase tracking-wider text-[rgba(15,15,15,0.5)] font-semibold">
                  MANDATORY NOTICE &amp; DISCLOSURE
                </p>
                <p className="font-diegrotesk text-[13px] sm:text-[14px] leading-[1.55] tracking-[0.025em] text-[#2C2C2C]">
                  PLEASE READ THESE TERMS CAREFULLY TO ENSURE THAT YOU UNDERSTAND EACH PROVISION. RED APPLE IS A DIGITAL HEALTH INTELLIGENCE AND TELEHEALTH PLATFORM. IT DOES NOT PROVIDE EMERGENCY AMBULANCE OR IN-PERSON HOSPITAL SURGERY SERVICES. THESE TERMS CONTAIN BINDING ARBITRATION AND DISPUTE RESOLUTION PROVISIONS REQUIRING DISPUTES TO BE RESOLVED THROUGH INDIVIDUAL ARBITRATION RATHER THAN JURY TRIALS.
                </p>
              </div>

              {/* Sub-intro text */}
              <p className="font-diegrotesk text-[18px] sm:text-[20px] leading-[1.5] tracking-[0.033em] text-[#1E1E1E]">
                If you subscribe to, access, or use the Services, create an organization, invite patients or clinical staff to that organization, or use or allow use of that organization after being notified of a change to these Terms, you acknowledge your understanding of the then-current Agreement and agree to the Agreement on behalf of the Customer.
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
                <span>Red Apple Health Inc. // Legal &amp; Regulatory</span>
                <span>Document ID: RA-TERMS-2026</span>
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
