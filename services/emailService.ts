// emailService.ts
// Sends TOTP codes via EmailJS (browser SDK — no backend needed).
//


declare const emailjs: {
  init: (config: { publicKey: string }) => void;
  send: (
    serviceId: string,
    templateId: string,
    params: Record<string, string>,
    options?: { publicKey: string }
  ) => Promise<{ status: number; text: string }>;
};


const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID  as string | undefined;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined;
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  as string | undefined;

export interface SendTOTPResult {
  success: boolean;
  error?: string;
}

export const sendTOTPEmail = async (
  toEmail: string,
  totpCode: string
): Promise<SendTOTPResult> => {
  try {
        const emailjsClient = (window as any).emailjs;
        if (!emailjsClient) {
          throw new Error('EmailJS SDK not loaded');
    }
    if (!PUBLIC_KEY || !SERVICE_ID || !TEMPLATE_ID) {
      throw new Error('EmailJS not configured');
    }

    const toName = toEmail.split('@')[0];

    // Pass publicKey in the send call directly (no separate init needed)
    const response = await emailjsClient.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_email: toEmail,   // used in template "To Email" field as {{to_email}}
        to_name:  toName,    // {{to_name}} in template body
        totp:      totpCode,  // {{otp}} in template body
      },
      { publicKey: PUBLIC_KEY }
    );

    if (response.status === 200) {
      return { success: true };
    }
    return {
      success: false,
      error: 'Email delivery failed. Please try again.',
    };

  } catch (err: unknown) {
    // Return a generic error — never expose internal details to the client
    return { success: false, error: 'Failed to send verification email. Please try again.' };
  }
};

export const isEmailServiceConfigured = (): boolean => {
  return !!(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);
};