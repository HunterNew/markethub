import { initializeApp } from 'firebase/app'
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyAnmIcv85_ZrJ9Eci1ZHtbn7LyMFNJfHsg",
  authDomain: "market-d0708.firebaseapp.com",
  projectId: "market-d0708",
  storageBucket: "market-d0708.firebasestorage.app",
  messagingSenderId: "19578010448",
  appId: "1:19578010448:web:822b01545f3676ab784a55",
  measurementId: "G-0JYSE9NRVJ"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

// Disable app verification for testing (remove in production)
// auth.settings.appVerificationDisabledForTesting = true

let recaptchaVerifier: RecaptchaVerifier | null = null

export function setupRecaptcha(elementId: string): RecaptchaVerifier {
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear() } catch {}
    recaptchaVerifier = null
  }
  // Clear the container element
  const el = document.getElementById(elementId)
  if (el) el.innerHTML = ''

  recaptchaVerifier = new RecaptchaVerifier(auth, elementId, {
    size: 'invisible',
    callback: () => {},
    'expired-callback': () => { recaptchaVerifier = null }
  })
  return recaptchaVerifier
}

export async function sendPhoneOTP(phoneNumber: string, elementId: string): Promise<ConfirmationResult> {
  const verifier = setupRecaptcha(elementId)
  // Ensure phone has country code
  const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`
  const result = await signInWithPhoneNumber(auth, formattedPhone, verifier)
  return result
}

export async function verifyPhoneOTP(confirmationResult: ConfirmationResult, otp: string): Promise<boolean> {
  try {
    await confirmationResult.confirm(otp)
    return true
  } catch {
    return false
  }
}
