/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { Lock, Mail, Key, User, ArrowRight, Shield, Sparkles, AlertCircle, HelpCircle } from 'lucide-react';
import { playNotificationSound } from '../App';
const brandLogo = '/logo.jpeg';

export default function LoginScreen() {
  const { login, register, loginWithGoogle, resetPassword, authError } = useAuth();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [forgotPasswordMsg, setForgotPasswordMsg] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    
    if (!email || !password) {
      setErrorMsg('All credential lines must be specified.');
      return;
    }

    if (isSignUp && !fullName) {
      setErrorMsg('Full name is required for registration.');
      return;
    }

    if (isSignUp && !role) {
      setErrorMsg('Please select the user role for this account.');
      return;
    }

    setLoading(true);
    playNotificationSound('normal');

    try {
      if (isSignUp) {
        await register(email, password, fullName, role);
        setSuccessMsg(`Welcome, ${fullName}! Your security profile as [${role}] has been provisioned.`);
      } else {
        await login(email, password);
      }
      playNotificationSound('newItem');
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes('VERIFICATION_REQUIRED:')) {
        const emailAddr = err.message.split('VERIFICATION_REQUIRED:')[1];
        setVerificationEmail(emailAddr);
        setIsSignUp(false);
        setSuccessMsg(null);
        setErrorMsg(null);
      } else if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed')) {
        setErrorMsg(
          "Email/Password authentication is not yet enabled in your Firebase Console. " +
          "To fix this, please follow these steps:\n\n" +
          "1. Open Firebase Console (https://console.firebase.google.com/project/tranquil-eeb9c/authentication/providers)\n" +
          "2. Click 'Add new provider'\n" +
          "3. Select 'Email/Password' and set it to ENABLED\n" +
          "4. Click Save."
        );
      } else {
        setErrorMsg(err.message || 'Security Handshake details invalid. Guard denied entry.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Switch to reset mode
  const handleResetPassword = async () => {
    if (!email) {
      setErrorMsg('Please enter your email address to request links.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email);
      setSuccessMsg('A password reset link has been dispatched to your email.');
      setForgotPasswordMsg(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch password recovery.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    playNotificationSound('normal');
    try {
      await loginWithGoogle();
      playNotificationSound('newItem');
      setLoading(false);
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setLoading(false);
      
      if (err.code === 'auth/popup-closed-by-user' || err.message?.includes('popup-closed')) {
        setErrorMsg('Google sign-in was cancelled. Please try again.');
      } else if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        setErrorMsg(
          "This domain is not authorized for Google Sign-In in your Firebase Console. " +
          "Please verify your Firebase console settings or sign up below with Email/Password."
        );
      } else if (err.code === 'auth/invalid-credential' || err.message?.includes('invalid-credential')) {
        setErrorMsg(
          "Invalid OAuth client credentials or Firebase configuration. " +
          "Please check your setup or register using Email/Password."
        );
      } else if (err.code === 'auth/network-request-failed' || err.message?.includes('network')) {
        setErrorMsg('Network error. Please check your internet connection and try again.');
      } else if (err.message?.includes('deleted by the Director')) {
        setErrorMsg('This account has been permanently deleted. Access is revoked.');
      } else if (err.message?.includes('currently SUSPENDED') || err.message?.includes('currently DISABLED')) {
        setErrorMsg('Your account access has been restricted. Please contact the Director.');
      } else {
        setErrorMsg(err.message || 'Failed to authenticate with Google. Please try again.');
      }
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center p-4 bg-cover bg-center select-none"
      style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/d/1-N_2kp6Jh-qOeQtzaTwSCjbJS40SZkNR")' }}
    >
      {/* Editorial backdrop overlay blur */}
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[6px]" />

      <div className="w-full max-w-lg bg-white/90 backdrop-blur-xl border border-white/50 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6 relative z-10 animate-fade-in">
        {/* Brand identity header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-lg border border-white/40">
            <img
              src={brandLogo}
              alt="Tranquil Haven"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain p-1.5"
            />
          </div>
          <div>
            <h1 className="font-display font-black text-2xl text-black tracking-tight flex items-center justify-center gap-1.5">
              Tranquil Haven
              <span className="text-[9px] font-mono bg-black text-[#f5f0eb] px-1.5 py-0.5 rounded leading-none mt-1">2026</span>
            </h1>
            <p className="text-[10px] text-zinc-650 font-bold uppercase tracking-[0.25em] mt-1.5 block">
              Enterprise Secure Authorization Unit
            </p>
          </div>
        </div>

        {verificationEmail ? (
          <div className="space-y-6 text-center py-4 animate-fade-in" id="email-verification-screen">
            <div className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto shadow-sm animate-pulse">
              <Mail className="w-5 h-5 text-amber-700" />
            </div>
            
            <div className="space-y-3">
              <h2 className="font-display font-black text-lg text-black uppercase tracking-wide">
                Email Verification Pending
              </h2>
              <div className="text-xs text-zinc-600 leading-relaxed space-y-3 px-2">
                <p>
                  We have sent you an email verification to <strong className="text-black bg-[#faf7f3] border border-[#f1ebe3] px-2 py-0.5 rounded font-mono break-all font-semibold outline-none">{verificationEmail}</strong>.
                </p>
                <p>
                  Verify it and login using the credentials.
                </p>
              </div>
            </div>

            <button
              id="verification-login-btn"
              onClick={() => {
                setVerificationEmail(null);
                setErrorMsg(null);
                setSuccessMsg(null);
                setIsSignUp(false);
              }}
              className="w-full bg-black text-[#f5f0eb] hover:bg-zinc-900 font-bold uppercase text-xs p-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer border-none"
            >
              <span>Login</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            {/* Operational feedback loops */}
            {(errorMsg || authError) && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-xs flex gap-2 text-left">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="font-medium">{errorMsg || authError}</p>
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-58 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-xs flex gap-2 text-left">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="font-medium">{successMsg}</p>
              </div>
            )}

            {/* Normal Login Forms */}
            {!forgotPasswordMsg ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* High-Fidelity Google Sign-In pill button matching the screenshot */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGoogleSignIn}
                  className="w-full bg-white hover:bg-zinc-50 text-zinc-700 font-medium border border-zinc-200 rounded-full text-xs py-3 px-4 flex items-center justify-center gap-3 transition-colors shadow-xs cursor-pointer disabled:opacity-50 h-[46px] active:scale-[0.99] border-solid"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span className="font-sans font-medium text-sm text-zinc-700 tracking-normal normal-case">Sign in with Google</span>
                </button>

                {/* "or" separator divider */}
                <div className="relative my-4 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-200" />
                  </div>
                  <span className="relative bg-white/95 px-3 text-[12px] text-zinc-400 font-sans tracking-normal lowercase">
                    or
                  </span>
                </div>

                <div className="space-y-3.5">
                  {isSignUp && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Full Name</label>
                      <div className="flex items-center gap-2 border border-zinc-200 rounded-lg p-2.5 bg-white shadow-xs focus-within:ring-1 focus-within:ring-[#a89078]">
                        <User className="w-4 h-4 text-zinc-400" />
                        <input 
                          type="text" 
                          placeholder="e.g. Alex Mercer"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="flex-1 text-xs outline-none bg-transparent"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Email Address</label>
                    <div className="flex items-center gap-2 border border-zinc-200 rounded-lg p-2.5 bg-white shadow-xs focus-within:ring-1 focus-within:ring-[#a89078]">
                      <Mail className="w-4 h-4 text-zinc-400" />
                      <input 
                        type="email" 
                        placeholder="e.g. director@haven.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="flex-1 text-xs outline-none bg-transparent"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Password</label>
                      {!isSignUp && (
                        <button 
                          type="button" 
                          onClick={() => setForgotPasswordMsg(true)} 
                          className="text-[10px] text-zinc-650 hover:underline outline-none capitalize border-none bg-transparent"
                        >
                          Forgot?
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 border border-zinc-200 rounded-lg p-2.5 bg-white shadow-xs focus-within:ring-1 focus-within:ring-[#a89078]">
                      <Key className="w-4 h-4 text-zinc-400" />
                      <input 
                        type="password" 
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="flex-1 text-xs outline-none bg-transparent"
                      />
                    </div>
                  </div>

                  {isSignUp && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Designated Hotel Role</label>
                      <div className="flex items-center gap-2 border border-zinc-200 rounded-lg p-2 bg-white shadow-xs focus-within:ring-1 focus-within:ring-[#a89078]">
                        <Shield className="w-4 h-4 text-[#a89078]" />
                        <select 
                          value={role}
                          onChange={(e) => setRole(e.target.value as UserRole)}
                          className="flex-1 text-xs outline-none bg-transparent border-none py-1"
                        >
                          <option value="" disabled>Select role</option>
                          <option value="Director">Director (Root Executive)</option>
                          <option value="Manager">Manager (Oversight/Operations)</option>
                          <option value="Receptionist">Receptionist (Concierge Service)</option>
                          <option value="Maintenance Officer">Maintenance (Repairs/Housekeeping)</option>
                          <option value="Accountant">Accountant (General Ledger)</option>
                          <option value="Inventory Officer">Inventory (Warehousing)</option>
                          <option value="Security Officer">Security (Incident Guard)</option>
                          <option value="Guest">Guest (Smartphone Portal)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-black text-[#f5f0eb] hover:bg-zinc-900 font-bold uppercase text-xs p-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50 border-none mt-5"
                >
                  <span>{loading ? 'Executing Handshake...' : isSignUp ? 'SIGN UP' : 'LOGIN'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-xs text-zinc-650 hover:text-black hover:underline cursor-pointer border-none bg-transparent"
                  >
                    {isSignUp ? 'Already registered? Authenticate here' : 'Need new credentials? Register here'}
                  </button>
                </div>


              </form>
            ) : (
              <div className="space-y-4 pt-2">
                <h3 className="font-display font-bold text-sm text-black uppercase tracking-wide">
                  Request Password Dispatch Link
                </h3>
                <p className="text-[11px] text-zinc-500 leading-normal">
                  Enter your registered email address and our systems will dispatch details to re-verify your password.
                </p>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Email Address</label>
                  <div className="flex items-center gap-2 border border-zinc-200 rounded-lg p-2.5 bg-white shadow-xs">
                    <Mail className="w-4 h-4 text-zinc-400" />
                    <input 
                      type="email" 
                      placeholder="director@haven.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 text-xs outline-none bg-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-3">
                  <button
                    onClick={() => setForgotPasswordMsg(false)}
                    className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs p-2.5 rounded-lg border-none cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={loading}
                    className="flex-1 bg-black text-white hover:bg-zinc-900 font-bold text-xs p-2.5 rounded-lg border-none cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Dispatching...' : 'Dispatch Reset Link'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
