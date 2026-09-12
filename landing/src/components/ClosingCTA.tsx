import React, { useState } from 'react';
import { Send, CheckCircle2, ShieldCheck, Mail } from 'lucide-react';

export const ClosingCTA: React.FC = () => {
  const [stakeholder, setStakeholder] = useState<string>('investor');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

  return (
    <section id="contact" className="relative w-full bg-[#070707] text-white py-24 md:py-32 px-6 sm:px-12 md:px-16 lg:px-24 font-sans select-none border-t border-neutral-900 overflow-hidden">
      
      {/* Background Accent */}
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] bg-crimson/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-16 relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Headline */}
          <div className="lg:col-span-6 space-y-6">
            <div className="font-mono text-[10px] sm:text-[11px] text-crimson font-bold tracking-[0.25em] uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-crimson" />
              <span>GET IN TOUCH</span>
            </div>

            <h2 className="font-display font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white tracking-[-0.03em] uppercase leading-[0.95]">
              INTERESTED IN RED APPLE?
            </h2>

            <p className="font-sans text-sm sm:text-base text-neutral-300 leading-relaxed max-w-lg">
              Whether you're an investor seeking to back foundational African healthcare, a clinic aiming to digitize operations, or a specialist looking to join our telemedicine network — we’d like to talk.
            </p>

            {/* Direct Channels */}
            <div className="pt-6 space-y-3 font-mono text-xs text-neutral-400">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-crimson" />
                <span>partnerships@redapplehealth.africa</span>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>NDPA / HIPAA Zero-Knowledge Data Protection</span>
              </div>
            </div>
          </div>

          {/* Right Interactive Inquiry Form */}
          <div className="lg:col-span-6 bg-neutral-950 border border-neutral-800 p-8 sm:p-10 shadow-2xl relative">
            
            {submitted ? (
              <div className="py-12 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-crimson mx-auto" />
                <h3 className="font-display font-black text-2xl uppercase text-white">
                  INQUIRY RECEIVED
                </h3>
                <p className="font-sans text-xs text-neutral-400 max-w-sm mx-auto">
                  Thank you for reaching out. A partner from our executive team will review your inquiry and follow up within 24 hours.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="pt-4 font-mono text-xs text-crimson uppercase underline cursor-pointer"
                >
                  Send another inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                
                <div className="space-y-2">
                  <label className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider block">
                    I AM INQUIRING AS A:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'investor', label: 'INVESTOR' },
                      { id: 'clinic', label: 'CLINIC' },
                      { id: 'specialist', label: 'SPECIALIST' },
                    ].map((s) => (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => setStakeholder(s.id)}
                        className={`py-2 px-1 text-center font-mono text-[10px] font-bold uppercase tracking-wider border cursor-pointer transition-all ${
                          stakeholder === s.id
                            ? 'bg-crimson border-crimson text-white'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider block">
                    YOUR NAME:
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Amina Bello / David Adeleke"
                    className="w-full bg-neutral-900 border border-neutral-800 px-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-crimson"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider block">
                    WORK EMAIL:
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. amina@hospital.org / david@venture.com"
                    className="w-full bg-neutral-900 border border-neutral-800 px-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-crimson"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-crimson hover:bg-crimson/90 text-white font-mono text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-crimson/20"
                >
                  <span>SUBMIT INQUIRY</span>
                  <Send className="w-3.5 h-3.5" />
                </button>

                <p className="font-mono text-[9px] text-neutral-400 text-center uppercase tracking-widest pt-1">
                  CONFIDENTIAL &amp; ENCRYPTED · ZERO DATA SHARING
                </p>

              </form>
            )}

          </div>

        </div>

      </div>
    </section>
  );
};
