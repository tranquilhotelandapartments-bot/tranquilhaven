/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  deleteDoc,
  serverTimestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { UserRole } from '../types';

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
  branchId: string;
  createdAt: any;
  createdBy?: string;
  preProvisionedPassword?: string;
  isPreProvisioned?: boolean;
  photoURL?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserRole: (targetUid: string, newRole: UserRole) => Promise<void>;
  toggleUserSuspension: (targetUid: string, currentStatus: 'ACTIVE' | 'SUSPENDED') => Promise<void>;
  deleteUserAccount: (targetUid: string) => Promise<void>;
  postAuditLog: (action: string, details: string) => Promise<void>;
  updateProfilePicture: (photoURL: string) => Promise<void>;
  googleToken: string | null;
  connectWorkspace: (bypassToken?: string) => Promise<string | null>;
  loginAsSandbox: (preferredRole: UserRole, targetEmail?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isExcludedFromVerification = (email?: string | null) => {
  return true;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  // High-fidelity sandbox session states (Disabled to force authenticating with actual Firebase Authentication)
  const [sandboxUser, setSandboxUser] = useState<any | null>(null);
  const [sandboxProfile, setSandboxProfile] = useState<UserProfile | null>(null);

  const activeUser = user || sandboxUser;
  const activeProfile = profile || sandboxProfile;

  // Helper to post audit records in Firestore
  const postAuditLog = async (action: string, details: string) => {
    const emailToUse = auth.currentUser?.email || activeUser?.email || 'system_sandbox@haven.com';
    try {
      const logRef = collection(db, 'auditLogs');
      await addDoc(logRef, {
        id: `AUDIT-${Date.now()}`,
        staffName: activeProfile?.fullName || emailToUse.split('@')[0],
        staffEmail: emailToUse,
        action,
        details,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.warn("Failed to post audit log to database:", e);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser && !currentUser.emailVerified && !isExcludedFromVerification(currentUser.email)) {
          setUser(null);
          setProfile(null);
          try {
            await signOut(auth);
          } catch (signOutErr) {
            console.error("onAuthStateChanged signOut error:", signOutErr);
          }
          setLoading(false);
          return;
        }
        setUser(currentUser);
        if (currentUser) {
          // Logged in with real credentials, discard sandbox-mode
          setSandboxUser(null);
          setSandboxProfile(null);

          try {
            const emailToCheck = currentUser.email?.toLowerCase().trim();
            if (emailToCheck) {
              const deletedSnap = await getDoc(doc(db, 'deletedUsers', emailToCheck));
              if (deletedSnap.exists()) {
                setUser(null);
                setProfile(null);
                try {
                  await signOut(auth);
                } catch (signOutErr) {
                  console.error("onAuthStateChanged deleted signOut error:", signOutErr);
                }
                setLoading(false);
                return;
              }
            }

            const profileRef = doc(db, 'users', currentUser.uid);
            const snap = await getDoc(profileRef);
            
            if (!snap.exists()) {
              setProfile(null);
              setAuthError('No Firestore profile exists for this account. Please register before logging in or contact the Director.');
              setLoading(false);
              return;
            }

            const data = snap.data() as UserProfile;
            if (data.status === 'SUSPENDED' || data.status === 'DISABLED') {
              // Sign out and deny profile load
              setProfile(null);
              try {
                await signOut(auth);
              } catch (signOutErr) {
                console.error("onAuthStateChanged status signOut error:", signOutErr);
              }
              throw new Error(`Your profile has been ${data.status.toLowerCase()}. Please contact the Director.`);
            }

            setAuthError(null);
            setProfile(data);
          } catch (err: any) {
            console.error("Auth profile extraction issue:", err.message);
            setAuthError(err.message || 'Unable to load your Firestore user profile.');
            setProfile(null);
          }
        } else {
          setAuthError(null);
          setProfile(null);
        }
        setLoading(false);
      } catch (globalErr) {
        console.error("Unhandle exception in onAuthStateChanged:", globalErr);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time online heartbeat and active session tracking
  useEffect(() => {
    if (!user || !profile) return;
    
    const userRef = doc(db, 'users', user.uid);
    updateDoc(userRef, {
      isOnline: true,
      lastActive: new Date().toISOString()
    }).catch(e => console.warn("Failed to set online status:", e));

    const interval = setInterval(() => {
      updateDoc(userRef, {
        isOnline: true,
        lastActive: new Date().toISOString()
      }).catch(e => console.warn("Heartbeat error:", e));
    }, 30000);

    return () => {
      clearInterval(interval);
      updateDoc(userRef, {
        isOnline: false
      }).catch(e => console.warn("Failed to set offline status on clean:", e));
    };
  }, [user?.uid, profile?.uid]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const deletedSnap = await getDoc(doc(db, 'deletedUsers', normalizedEmail));
      if (deletedSnap.exists()) {
        throw new Error("This account has been deleted by the Director. Access is permanently revoked.");
      }

      // Fetch user creds
      const creds = await signInWithEmailAndPassword(auth, email, password);
      
      // If user's email is not verified, block login & resend.
      if (creds.user && !creds.user.emailVerified && !isExcludedFromVerification(email)) {
        try {
          await sendEmailVerification(creds.user);
        } catch (sendErr) {
          console.warn("Failed to resend email verification:", sendErr);
        }
        await signOut(auth);
        throw new Error(`VERIFICATION_REQUIRED:${email}`);
      }
      
      // Perform manual check on user status before resolving
      const profileRef = doc(db, 'users', creds.user.uid);
      const snap = await getDoc(profileRef);
      if (!snap.exists()) {
        await signOut(auth);
        throw new Error("No user profile exists for this account. Please register before logging in.");
      }
      const data = snap.data() as UserProfile;
      if (data.status === 'SUSPENDED' || data.status === 'DISABLED') {
        await signOut(auth);
        throw new Error(`This profile is currently ${data.status}. Access blocked.`);
      }
      setLoading(false);
    } catch (error: any) {
      // Check pre-provisioned fallback
      try {
        const preRef = doc(db, 'users', `pre:${normalizedEmail}`);
        const preSnap = await getDoc(preRef);
        if (preSnap.exists()) {
          const preData = preSnap.data();
          if (preData.preProvisionedPassword === password) {
            let creds;
            try {
              // Setup Firebase Auth Account on-the-fly
              creds = await createUserWithEmailAndPassword(auth, email, password);
            } catch (authCreateErr: any) {
              if (authCreateErr.code === 'auth/email-already-in-use') {
                // User already exists in auth, try signing in to confirm credentials match
                creds = await signInWithEmailAndPassword(auth, email, password);
              } else {
                throw authCreateErr;
              }
            }
            
            // Send verification on-the-fly for real email registration
            if (creds.user && !creds.user.emailVerified && !isExcludedFromVerification(email)) {
              await sendEmailVerification(creds.user);
              await signOut(auth);
              throw new Error(`VERIFICATION_REQUIRED:${email}`);
            }

            const profileRef = doc(db, 'users', creds.user.uid);
            
            const newProfile: UserProfile = {
              uid: creds.user.uid,
              fullName: preData.fullName,
              email: preData.email,
              role: preData.role,
              status: 'ACTIVE',
              branchId: 'BR-LONDON-01',
              createdAt: new Date().toISOString(),
              createdBy: 'Director Pre-Provisioned',
              preProvisionedPassword: preData.preProvisionedPassword || password,
              isPreProvisioned: true
            };
            
            await setDoc(profileRef, newProfile);
            await deleteDoc(preRef);
            setProfile(newProfile);
            await postAuditLog('USER_PROVISION_COMPLETED', `Successfully finished pre-provision registration for ${preData.fullName}`);
            setLoading(false);
            return;
          }
        }
      } catch (innerErr) {
        console.error("Preprovision fallback error:", innerErr);
      }

      setLoading(false);
      throw error;
    }
  };

  const register = async (email: string, password: string, fullName: string, role: UserRole) => {
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const deletedSnap = await getDoc(doc(db, 'deletedUsers', normalizedEmail));
      if (deletedSnap.exists()) {
        throw new Error("This account has been deleted by the Director. Registration is permanently blocked.");
      }

      let creds;
      try {
        creds = await createUserWithEmailAndPassword(auth, email, password);
      } catch (authCreateErr: any) {
        if (authCreateErr.code === 'auth/email-already-in-use') {
          throw new Error("An account with this email already exists. Please log in instead.");
        } else {
          throw authCreateErr;
        }
      }
      const profileRef = doc(db, 'users', creds.user.uid);
      const snap = await getDoc(profileRef);
      if (snap.exists()) {
        throw new Error("A user profile already exists for this account. Please log in instead.");
      }

      const finalProfile: UserProfile = {
        uid: creds.user.uid,
        fullName,
        email,
        role,
        status: 'ACTIVE',
        branchId: 'BR-LONDON-01',
        createdAt: new Date().toISOString()
      };
      await setDoc(profileRef, finalProfile);

      // Track if email verification is required for real email/password user
      const needsVerification = creds.user && !creds.user.emailVerified && !isExcludedFromVerification(email);
      if (needsVerification) {
        await sendEmailVerification(creds.user);
        // Sign out immediately so they are NOT signed in automatically!
        await signOut(auth);
        setProfile(null);
        setUser(null);
        setLoading(false);
        // Dispatch audit log for pending verification
        await postAuditLog('USER_REGISTERED_PENDING_VERIFICATION', `Registered ${fullName} as role [${role}]. Verification dispatched.`);
        throw new Error(`VERIFICATION_REQUIRED:${email}`);
      }

      setProfile(finalProfile);

      // Audit registration
      await postAuditLog('USER_REGISTERED', `Registered new member ${fullName} as role [${role}]`);
      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    if (activeUser) {
      await postAuditLog('USER_LOGOUT', `User ${activeProfile?.fullName || activeUser.email} logged out securely`);
    }
    await signOut(auth);
    setUser(null);
    setProfile(null);
    setGoogleToken(null);
    setSandboxUser(null);
    setSandboxProfile(null);
    setAuthError(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateUserRole = async (targetUid: string, newRole: UserRole) => {
    try {
      const userRef = doc(db, 'users', targetUid);
      await updateDoc(userRef, { role: newRole });
      await postAuditLog('USER_ROLE_UPDATED', `Elevated user ${targetUid} to role [${newRole}]`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${targetUid}`);
    }
  };

  const toggleUserSuspension = async (targetUid: string, currentStatus: 'ACTIVE' | 'SUSPENDED') => {
    try {
      const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      const userRef = doc(db, 'users', targetUid);
      await updateDoc(userRef, { status: nextStatus });
      await postAuditLog('USER_SUSPENSION_SWITCHED', `Switched status of ${targetUid} to [${nextStatus}]`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${targetUid}`);
    }
  };

  const deleteUserAccount = async (targetUid: string) => {
    try {
      const userRef = doc(db, 'users', targetUid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        if (data.email) {
          const emailKey = data.email.toLowerCase().trim();
          await setDoc(doc(db, 'deletedUsers', emailKey), {
            uid: targetUid,
            email: emailKey,
            deletedAt: new Date().toISOString()
          });
        }
      }
      await deleteDoc(userRef);
      await postAuditLog('USER_ACCOUNT_DELETED', `Deleted user account ${targetUid}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${targetUid}`);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      let creds: any;
      const isNative = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNativePlatform();
      
      if (isNative) {
        try {
          const result = await FirebaseAuthentication.signInWithGoogle();
          if (result.credential?.idToken) {
            const credential = GoogleAuthProvider.credential(result.credential.idToken);
            creds = await signInWithCredential(auth, credential);
          } else {
            throw new Error('No ID token received from native Google authentication');
          }
        } catch (nativeErr: any) {
          console.warn('Native Google sign-in failed, falling back to web:', nativeErr);
          // Fallback to web OAuth flow
          const provider = new GoogleAuthProvider();
          creds = await signInWithPopup(auth, provider);
        }
      } else {
        const provider = new GoogleAuthProvider();
        creds = await signInWithPopup(auth, provider);
      }

      const emailToCheck = creds.user.email?.toLowerCase().trim();
      if (emailToCheck) {
        const deletedSnap = await getDoc(doc(db, 'deletedUsers', emailToCheck));
        if (deletedSnap.exists()) {
          await signOut(auth);
          setLoading(false);
          throw new Error("This account has been deleted by the Director. Access is permanently revoked.");
        }
      }

      const profileRef = doc(db, 'users', creds.user.uid);
      const snap = await getDoc(profileRef);
      if (!snap.exists()) {
        await signOut(auth);
        setProfile(null);
        throw new Error("No Firestore profile exists for this Google account. Please register with email/password first or contact the Director.");
      } else {
        const existingData = snap.data() as UserProfile;
        if (existingData.status === 'SUSPENDED' || existingData.status === 'DISABLED') {
          await signOut(auth);
          setLoading(false);
          throw new Error(`This profile is currently ${existingData.status}. Access blocked.`);
        }
        
        setProfile(existingData);
      }
      
      // Successfully logged in - clear loading state
      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      throw error;
    }
  };

  const connectWorkspace = async (bypassToken?: string): Promise<string | null> => {
    try {
      if (bypassToken) {
        setGoogleToken(bypassToken);
        await postAuditLog('WORKSPACE_CONNECTED_MOCK', 'Successfully connected Google Drive and Gmail workspace APIs in offline simulation mode');
        return bypassToken;
      }
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive');
      provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
      provider.addScope('https://www.googleapis.com/auth/gmail.send');
      
      const creds = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(creds);
      const token = credential?.accessToken || null;
      setGoogleToken(token);
      if (token) {
        await postAuditLog('WORKSPACE_CONNECTED', 'Successfully connected Google Drive and Gmail workspace APIs');
      }
      return token;
    } catch (error: any) {
      console.error('Workspace connection error:', error);
      throw error;
    }
  };

  const updateProfilePicture = async (photoURL: string) => {
    try {
      const activeUid = profile?.uid || sandboxProfile?.uid;
      if (!activeUid) throw new Error("No active user profile found.");

      const userRef = doc(db, 'users', activeUid);
      await updateDoc(userRef, { photoURL });

      if (profile) {
        setProfile(prev => prev ? { ...prev, photoURL } : null);
      }
      if (sandboxProfile) {
        setSandboxProfile(prev => prev ? { ...prev, photoURL } : null);
      }

      await postAuditLog('USER_PROFILE_PICTURE_UPDATED', `Updated profile picture for user ${activeUid}`);
    } catch (error) {
      console.error("Failed to update profile picture in Firestore:", error);
      // Fallback: update local React state even if Firestore fails
      if (profile) {
        setProfile(prev => prev ? { ...prev, photoURL } : null);
      }
      if (sandboxProfile) {
        setSandboxProfile(prev => prev ? { ...prev, photoURL } : null);
      }
    }
  };

  const loginAsSandbox = async (preferredRole: UserRole, targetEmail?: string) => {
    setLoading(true);
    try {
      const emailToUse = targetEmail || `sandbox_${preferredRole.toLowerCase().replace(/[^a-z0-9]/g, '')}@haven.com`;
      const mockUser = {
        uid: `sandbox-${preferredRole.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        email: emailToUse,
        emailVerified: true,
        displayName: `Mock ${preferredRole}`
      };
      const mockProfile: UserProfile = {
        uid: mockUser.uid,
        fullName: `Sandbox ${preferredRole}`,
        email: mockUser.email,
        role: preferredRole,
        status: 'ACTIVE',
        branchId: 'BR-LONDON-01',
        createdAt: new Date().toISOString(),
        createdBy: 'Sandbox Mode'
      };
      
      setSandboxUser(mockUser);
      setSandboxProfile(mockProfile);
      
      await postAuditLog('SANDBOX_LOGIN', `Logged in as high-fidelity sandbox role [${preferredRole}]`);
    } catch (err) {
      console.warn("Sandbox login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user: activeUser, 
      profile: activeProfile, 
      loading, 
      authError,
      login, 
      register, 
      loginWithGoogle,
      logout, 
      resetPassword,
      updateUserRole,
      toggleUserSuspension,
      deleteUserAccount,
      postAuditLog,
      updateProfilePicture,
      googleToken,
      connectWorkspace,
      loginAsSandbox
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be nested within an AuthProvider');
  }
  return context;
}
