import React, { useState } from 'react';
import { Send, CheckCircle2, ShieldCheck, Mail, Sparkles } from 'lucide-react';

export const ClosingCTA: React.FC = () => {
  const [stakeholder, setStakeholder] = useState<string>('parent');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

  const stakeholderOptions = [
    { id: 'parent', label: '🌸 Expectant Mother / User' },
    { id: 'doctor', label: '🩺 OB-GYN or Midwife' },
    { id: 'clinic', label: '🏥 Clinic / Hospital Operator' },
    { id: 'partner', label: '🤝 Strategic Investor / Partner' },
  ];

  return (
    <section id="contact" className="relative w-full bg-neutral-50/60 py-24 md:py-32 px-6 sm:px-10 md:px-14 lg:px-20 font-sans border-t border-neutral-200/80 overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-16 relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Headline */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-800 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-crimson" />
              <span>We’d Love to Hear From You</span>
            </div>

            <h2 className="font-editorial text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-neutral-900 font-normal leading-tight tracking-tight">
              Ready to bring compassionate care to your{' '}
              <span className="italic text-crimson font-serif font-normal">
                community?
              </span>
            </h2>

            <p className="font-sans text-base text-neutral-600 leading-relaxed font-normal max-w-lg">
              Whether you are an expectant mother seeking guidance, an OB-GYN wanting to join our virtual network, or a clinic operator modernizing care — we are here for you.
            </p>

            {/* Direct Channels */}
            <div className="pt-4 space-y-3 text-xs text-neutral-700 font-medium">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-crimson">
                  <Mail className="w-4 h-4" />
                </div>
                <span>hello@redapplehealth.africa</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span>NDPA 2023 &amp; HIPAA Zero-Knowledge Data Protection</span>
              </div>
            </div>
          </div>

          {/* Right Inquiry Form */}
          <div className="lg:col-span-6 bg-white rounded-3xl border border-neutral-200 p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.06)] relative">
            
            {submitted ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-200">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-editorial text-2xl text-neutral-900 font-normal">
                  Thank you for reaching out!
                </h3>
                <p className="font-sans text-sm text-neutral-600 max-w-sm mx-auto">
                  A member of our maternal care team will connect with you within 24 hours.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-4 px-6 py-2.5 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-800 text-xs font-semibold hover:bg-neutral-200 transition-colors cursor-pointer"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                
                <div className="flex items-center gap-2.5 pb-2 border-b border-neutral-100">
                  <img src="/logo.png" alt="Red Apple" className="w-7 h-7 object-contain" />
                  <span className="font-editorial text-xl text-neutral-900 font-normal">
                    Get in touch with Red Apple
                  </span>
                </div>

                {/* Role Switcher */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-neutral-800">I am an:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {stakeholderOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setStakeholder(opt.id)}
                        className={`text-left p-2.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                          stakeholder === opt.id
                            ? 'bg-red-50 border-crimson text-crimson font-semibold'
                            : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Inputs */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Your Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Akosua Mensah"
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-crimson focus:outline-hidden text-sm bg-neutral-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-crimson focus:outline-hidden text-sm bg-neutral-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">How can we assist you?</label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Tell us about your needs, questions, or clinic location..."
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-crimson focus:outline-hidden text-sm bg-neutral-50/50 resize-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-full bg-crimson hover:bg-crimson-dark text-white font-medium text-xs transition-all shadow-md shadow-crimson/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Confidential Message</span>
                </button>

                <p className="text-[11px] text-neutral-500 text-center">
                  🔒 Strictly private. We never sell or share medical inquiries.
                </p>

              </form>
            )}

          </div>

        </div>

      </div>
    </section>
  );
};
