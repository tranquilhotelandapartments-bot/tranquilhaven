# Tranquil Haven - Security & Auth Configuration Guide

This document contains step-by-step instructions for members, administrators, and developers of **Tranquil Haven** to configure the Firebase project. This allows all users to sign up and sign in using Email/Password or Google OAuth, and seamlessly transition into their respective staff or guest screens **without needing any code changes**.

---

## 1. Enable Email/Password Sign-In
To allow new team members and guests to self-register with their designated role and log in normally:

1. Open your [Firebase Console](https://console.firebase.google.com/).
2. Select your project **Tranquil Haven** (or corresponding project ID).
3. Navigate to **Authentication** from the left-hand menu.
4. Click on the **Sign-in method** tab.
5. Click **Add new provider** (or edit the existing one).
6. Select **Email/Password**.
7. Toggle the switch to **Enabled** (you do not need to enable passwordless sign-in link).
8. Click **Save**.

---

## 2. Authorize Preview & Custom Domains
If users encounter an `auth/unauthorized-domain` error during Google Sign-In or Google Workspace integration, you must add the application's hosting/preview domains to your Firebase authorized domains list:

1. Open your [Firebase Console](https://console.firebase.google.com/).
2. Go to **Authentication** &rarr; **Settings** &rarr; **Authorized domains**.
3. Click **Add domain**.
4. Paste the active preview domains:
   - `ais-dev-pnddq6fejt42wkr5gy76kf-891032900907.europe-west2.run.app`
   - `ais-pre-pnddq6fejt42wkr5gy76kf-891032900907.europe-west2.run.app`
5. Click **Add**.

---

## 3. General Registration and Sign-In Flow
Once the configurations above are complete:
- **Sign Up**: Select "Need new credentials? Register here" on the sign-in screen. Type in your details, select your **Designated Hotel Role** (e.g. Director, Manager, Receptionist, Maintenance, etc.), and click **Sign Up**.
- **Role-Based Access**: The system will automatically direct you to your tailored dashboard (e.g., Director console, Housekeeping dispatch, Front desk lobby, etc.) based on your registration.
