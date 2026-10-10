import React, { useState, useEffect, useRef } from 'react';
import {
  simulateGoogleOAuth,
  lookupWhitelist,
  buildUserFromEntry,
  generateAndSendTOTP,
  validateTOTP,
  clearTOTPSession,
} from '../services/authService';
import { User, WhitelistEntry } from '../types';
import { Images } from '../src/assets/images';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

type LoginStep =
  | 'idle'
  | 'authenticating'
  | 'sending_totp'
  | 'totp'
  | 'verifying'
  | 'error';

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [step, setStep]                     = useState<LoginStep>('idle');
  const [emailInput, setEmailInput]         = useState('');
  const [totpDigits, setTotpDigits]         = useState(['', '', '', '', '', '']);
  const [pendingEntry, setPendingEntry]     = useState<WhitelistEntry | null>(null);
  const [errorMsg, setErrorMsg]             = useState<string | null>(null);
  const [totpError, setTotpError]           = useState<string | null>(null);
  const [totpAttempts, setTotpAttempts]     = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [developmentOTP, setDevelopmentOTP] = useState<string | null>(null);

  const digitRefs = useRef<Array<HTMLInputElement | null>>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    clearTOTPSession();
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  // ── Cooldown timer ────────────────────────────────────────────
  const startCooldown = () => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // ── 6-box digit input ─────────────────────────────────────────
  const handleDigitChange = (i: number, val: string) => {
    const d = val.replace(/\D/g, '').slice(-1);
    const next = [...totpDigits];
    next[i] = d;
    setTotpDigits(next);
    setTotpError(null);
    if (d && i < 5) digitRefs.current[i + 1]?.focus();
  };

  const handleDigitKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !totpDigits[i] && i > 0) {
      digitRefs.current[i - 1]?.focus();
    }
    if (e.key === 'Enter') {
      const code = totpDigits.join('');
      if (code.length === 6) submitTOTP(code);
    }
  };

  const handleDigitPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = Array(6).fill('');
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setTotpDigits(next);
    digitRefs.current[Math.min(pasted.length - 1, 5)]?.focus();
  };

  // ── Prepare OTP challenge ─────────────────────────────────────
  const sendTOTP = async (entry: WhitelistEntry) => {
    setStep('sending_totp');
    setDevelopmentOTP(null);
    setTotpError(null);

    const result = await generateAndSendTOTP(entry.email);

    if (!result.success) {
      setErrorMsg(result.error ?? 'OTP verification is unavailable. Please try again later.');
      setStep('error');
      return;
    }

    setDevelopmentOTP(result.developmentCode ?? null);
    if (result.developmentCode) {
      console.info('[College Saathi] Development OTP:', result.developmentCode);
    }
    setTotpDigits(['', '', '', '', '', '']);
    setTotpAttempts(0);
    startCooldown();
    setStep('totp');
    setTimeout(() => digitRefs.current[0]?.focus(), 100);
  };

  // ── Google sign-in ────────────────────────────────────────────
  const handleGoogleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim())) {
      setErrorMsg('Enter a valid email address to continue.');
      return;
    }

    setStep('authenticating');

    try {
      const google = await simulateGoogleOAuth(emailInput);

      const entry = lookupWhitelist(google.email);
      if (!entry) {
        setErrorMsg(
          'Access denied. This email is not registered in the institutional whitelist. ' +
          'Contact your administrator if you believe this is an error.'
        );
        setStep('error');
        return;
      }

      setPendingEntry(entry);
      await sendTOTP(entry);
    } catch (error) {
      setErrorMsg(error instanceof Error
        ? error.message
        : 'Authentication service encountered an error. Please try again.');
      setStep('error');
    }
  };

  // ── Verify entered code ───────────────────────────────────────
  const submitTOTP = async (code: string) => {
    if (!pendingEntry) return;
    setStep('verifying');

    const valid = await validateTOTP(code, pendingEntry.email);

    if (!valid) {
      const attempts = totpAttempts + 1;
      setTotpAttempts(attempts);
      if (attempts >= 5) {
        setErrorMsg('Too many incorrect attempts. Please start the sign-in process again.');
        setStep('error');
        setPendingEntry(null);
        return;
      }
      setTotpError(`Incorrect code. ${5 - attempts} attempt${5 - attempts !== 1 ? 's' : ''} remaining.`);
      setTotpDigits(['', '', '', '', '', '']);
      setStep('totp');
      setTimeout(() => digitRefs.current[0]?.focus(), 50);
      return;
    }

    onLoginSuccess(buildUserFromEntry(pendingEntry));
  };

  const handleVerifyClick = () => {
    const code = totpDigits.join('');
    if (code.length === 6) submitTOTP(code);
  };

  const handleResend = async () => {
    if (!pendingEntry || resendCooldown > 0) return;
    setTotpError(null);
    await sendTOTP(pendingEntry);
  };

  const handleReset = () => {
    setStep('idle');
    setErrorMsg(null);
    setTotpError(null);
    setTotpDigits(['', '', '', '', '', '']);
    setPendingEntry(null);
    setDevelopmentOTP(null);
    clearTOTPSession();
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setResendCooldown(0);
  };

  const isSubmitting = step === 'authenticating' || step === 'sending_totp' || step === 'verifying';
  const codeComplete = totpDigits.join('').length === 6;

  // ── Masked email for display ──────────────────────────────────
  const maskEmail = (email: string) => {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    const visible = local.length > 3 ? local.slice(0, 3) : local.slice(0, 1);
    return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 3))}@${domain}`;
  };

  return (
    <div className="w-full max-w-2xl px-3 py-6 md:px-4 md:py-12 flex flex-col items-center">
      <div className="w-full bg-white rounded-[2rem] md:rounded-[3rem] shadow-[0_35px_60px_-15px_rgba(0,33,71,0.08)] border-2 border-slate-100 overflow-hidden">

        {/* Top stripe */}
        <div className="flex h-1.5 w-full">
          <div className="flex-1 bg-nfsu-navy"></div>
          <div className="flex-1 bg-nfsu-gold"></div>
          <div className="flex-1 bg-nfsu-maroon"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2">

          {/* ── Left panel ── */}
          <div className="bg-nfsu-navy p-8 md:p-12 text-white flex flex-col justify-center items-center text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-institutional-pattern opacity-10"></div>
            <div className="relative z-10 w-full">
              <div className="w-16 h-16 md:w-24 md:h-24 bg-white rounded-3xl mx-auto mb-6 flex items-center justify-center p-3 shadow-2xl border-2 border-nfsu-gold/20">
                <img src={Images.nfsuLogo} alt="NFSU" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase italic leading-none mb-3">
                College<br /><span className="text-nfsu-gold">Saathi</span>
              </h2>
              <div className="w-10 h-1 bg-nfsu-gold mx-auto mb-5"></div>
              <p className="text-nfsu-gold/50 text-[9px] font-black uppercase tracking-[0.4em] leading-relaxed mb-8">
                Secure Institutional<br />Access Gateway
              </p>

              <div className="text-left space-y-3 mt-2">
                {[
                  ['Email Access', 'Whitelisted email only'],
                  ['OTP Verification', 'Demo code shown; no email sent'],
                ].map(([label, desc]) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-nfsu-gold mt-[5px] flex-shrink-0"></div>
                    <div>
                      <div className="text-[9px] font-black text-white uppercase tracking-widest">{label}</div>
                      <div className="text-[9px] font-bold text-nfsu-gold/40 uppercase tracking-wider">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right panel ── */}
          <div className="p-6 md:p-10 bg-white flex flex-col justify-center">

            {/* ── STEP: idle / authenticating ── */}
            {(step === 'idle' || step === 'authenticating') && (
              <div className="space-y-7 animate-fadeIn">
                <div>
                  <h3 className="text-xl font-black text-nfsu-navy uppercase italic tracking-tighter">Sign In</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    National Forensic Sciences University
                  </p>
                </div>

                <form onSubmit={handleGoogleSignIn} className="space-y-5">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Institutional Email
                    </label>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={e => setEmailInput(e.target.value)}
                      placeholder="name@nfsu.ac.in"
                      disabled={step === 'authenticating'}
                      className="w-full px-5 py-4 rounded-2xl bg-amber-50 border-2 border-amber-100 focus:border-nfsu-navy focus:bg-white outline-none font-bold text-sm placeholder-slate-300 transition-all disabled:opacity-50"
                    />
                    <p className="text-[9px] text-slate-400 font-bold mt-1.5 uppercase tracking-wider">
                      Access granted only to whitelisted emails.
                    </p>
                  </div>

                  {errorMsg && step !== 'error' && (
                    <div className="bg-red-50 border-l-4 border-nfsu-maroon p-3 rounded-r-xl">
                      <p className="text-[9px] text-nfsu-maroon font-black uppercase tracking-tight">{errorMsg}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={step === 'authenticating'}
                    className="w-full py-4 rounded-2xl bg-white border-2 border-slate-200 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:border-nfsu-navy hover:shadow-lg transition-all disabled:opacity-50 shadow-sm"
                  >
                    {step === 'authenticating' ? (
                      <>
                        <span className="w-4 h-4 border-2 border-slate-300 border-t-nfsu-navy rounded-full animate-spin"></span>
                        Authenticating...
                      </>
                    ) : (
                      <>
                        Continue with email
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* ── STEP: sending TOTP ── */}
            {step === 'sending_totp' && (
              <div className="space-y-6 animate-fadeIn text-center py-4">
                <div className="w-14 h-14 border-4 border-nfsu-navy border-t-nfsu-gold rounded-full animate-spin mx-auto"></div>
                <div>
                  <h3 className="text-lg font-black text-nfsu-navy uppercase italic tracking-tighter">Preparing Code</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">
                    Preparing verification for<br />{pendingEntry ? maskEmail(pendingEntry.email) : '...'}
                  </p>
                </div>
              </div>
            )}

            {/* ── STEP: TOTP entry ── */}
            {step === 'totp' && pendingEntry && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h3 className="text-xl font-black text-nfsu-navy uppercase italic tracking-tighter">Verify Your Identity</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    Enter the demo code to continue
                  </p>
                </div>

                {developmentOTP ? (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
                    <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest mb-1">
                      Demo mode: enter the displayed OTP to continue.
                    </p>
                    <p className="text-2xl font-mono font-black tracking-[0.35em] text-amber-800" aria-label="Development verification code">
                      {developmentOTP}
                    </p>
                    <p className="text-[9px] font-bold text-amber-600 leading-relaxed mt-1">
                      Demo OTP: no email is sent. This does not verify a Firebase identity or grant Supabase access.
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Verification For</p>
                    <p className="font-mono font-black text-nfsu-navy text-sm tracking-wide">{maskEmail(pendingEntry.email)}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                      Valid for 5 minutes.
                    </p>
                  </div>
                )}

                {/* 6-digit input boxes */}
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    Enter 6-Digit Code
                  </label>
                  <div className="flex gap-1.5 justify-between" onPaste={handleDigitPaste}>
                    {totpDigits.map((d, i) => (
                      <input
                        key={i}
                        ref={el => { digitRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={e => handleDigitChange(i, e.target.value)}
                        onKeyDown={e => handleDigitKeyDown(i, e)}
                        disabled={step === 'verifying'}
                        className={`w-10 h-12 rounded-xl border-2 text-center font-mono font-black text-lg outline-none transition-all flex-shrink-0
                          ${d ? 'border-nfsu-navy bg-nfsu-navy/5 text-nfsu-navy' : 'border-slate-200 bg-slate-50 text-slate-600'}
                          focus:border-nfsu-gold focus:bg-white
                          ${totpError ? 'border-nfsu-maroon bg-red-50' : ''}
                          disabled:opacity-50`}
                      />
                    ))}
                  </div>
                </div>

                {totpError && (
                  <div className="bg-red-50 border-l-4 border-nfsu-maroon p-3 rounded-r-xl animate-shake">
                    <p className="text-[9px] text-nfsu-maroon font-black uppercase tracking-tight">{totpError}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase text-[9px] tracking-widest hover:bg-slate-200 transition-all border-b-4 border-slate-200"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyClick}
                    disabled={!codeComplete || step === 'verifying'}
                    className="flex-[2] py-4 bg-nfsu-navy text-white font-black rounded-2xl uppercase text-[9px] tracking-widest shadow-xl hover:bg-nfsu-maroon transition-all border-b-4 border-black/20 disabled:opacity-40"
                  >
                    {step === 'verifying' ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                        Verifying...
                      </span>
                    ) : 'Verify Identity'}
                  </button>
                </div>

                <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendCooldown > 0 || isSubmitting}
                      className="text-[9px] font-black uppercase tracking-widest disabled:text-slate-300 text-nfsu-navy hover:text-nfsu-gold transition-colors"
                    >
                      {resendCooldown > 0
                        ? `Resend code in ${resendCooldown}s`
                        : 'Resend Code'}
                    </button>
                  </div>
              </div>
            )}

            {/* ── STEP: verifying spinner ── */}
            {step === 'verifying' && (
              <div className="space-y-4 animate-fadeIn text-center py-4">
                <div className="w-12 h-12 border-4 border-nfsu-navy border-t-nfsu-gold rounded-full animate-spin mx-auto"></div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Verifying code...</p>
              </div>
            )}

            {/* ── STEP: terminal error ── */}
            {step === 'error' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto border-2 border-red-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-nfsu-maroon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-black text-nfsu-maroon uppercase italic tracking-tighter text-center">Access Denied</h3>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider text-center mt-2 leading-relaxed">{errorMsg}</p>
                </div>
                <button
                  onClick={handleReset}
                  className="w-full py-4 bg-nfsu-navy text-white font-black rounded-2xl uppercase text-[9px] tracking-widest shadow-xl border-b-4 border-black/20 hover:bg-nfsu-maroon transition-all"
                >
                  Try Again
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};