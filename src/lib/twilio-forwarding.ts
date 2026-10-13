import { mapCarrierFromLineIntelligence } from "@/lib/call-forwarding-carriers";
import { toE164Us } from "@/lib/call-forwarding-codes";

export type TwilioLineLookupResult = {
  e164: string;
  carrierName: string | null;
  lineType: string | null;
  carrierKey: ReturnType<typeof mapCarrierFromLineIntelligence>["carrierKey"];
  confidence: ReturnType<typeof mapCarrierFromLineIntelligence>["confidence"];
  summary: string;
};

function readTwilioConfig(): { accountSid: string; authToken: string; smsFrom: string } | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const smsFrom = process.env.TWILIO_SMS_FROM_NUMBER?.trim();
  if (!accountSid || !authToken || !smsFrom) return null;
  return { accountSid, authToken, smsFrom };
}

export function isTwilioForwardingConfigured(): boolean {
  return readTwilioConfig() != null;
}

async function twilioBasicAuthHeader(): Promise<string | null> {
  const cfg = readTwilioConfig();
  if (!cfg) return null;
  const token = Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString("base64");
  return `Basic ${token}`;
}

export async function lookupLineTypeIntelligence(
  phoneRaw: string,
): Promise<{ ok: true; data: TwilioLineLookupResult } | { ok: false; error: string }> {
  const cfg = readTwilioConfig();
  if (!cfg) {
    return { ok: false, error: "Twilio is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_SMS_FROM_NUMBER." };
  }

  const e164 = toE164Us(phoneRaw);
  if (!e164) {
    return { ok: false, error: "Enter a valid US or Canada mobile number (10 digits)." };
  }

  const auth = await twilioBasicAuthHeader();
  if (!auth) {
    return { ok: false, error: "Twilio is not configured." };
  }

  const encoded = encodeURIComponent(e164);
  const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encoded}?Fields=line_type_intelligence`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: { Authorization: auth },
      cache: "no-store",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Twilio lookup failed: ${message}` };
  }

  const payload = (await res.json().catch(() => null)) as Record<string, unknown> | null;

  if (!res.ok) {
    const twilioMsg =
      payload && typeof payload.message === "string"
        ? payload.message
        : `Twilio returned HTTP ${res.status}`;
    return { ok: false, error: twilioMsg };
  }

  const intel =
    payload?.line_type_intelligence && typeof payload.line_type_intelligence === "object"
      ? (payload.line_type_intelligence as Record<string, unknown>)
      : null;

  const carrierName =
    intel && typeof intel.carrier_name === "string" ? intel.carrier_name.trim() : null;
  const lineType = intel && typeof intel.type === "string" ? intel.type.trim() : null;

  const mapped = mapCarrierFromLineIntelligence({ carrierName, lineType });

  return {
    ok: true,
    data: {
      e164,
      carrierName,
      lineType,
      carrierKey: mapped.carrierKey,
      confidence: mapped.confidence,
      summary: mapped.summary,
    },
  };
}

export async function sendTwilioSms(args: {
  toE164: string;
  body: string;
}): Promise<{ ok: true; sid: string } | { ok: false; error: string }> {
  const cfg = readTwilioConfig();
  if (!cfg) {
    return { ok: false, error: "Twilio SMS is not configured." };
  }

  const auth = await twilioBasicAuthHeader();
  if (!auth) {
    return { ok: false, error: "Twilio SMS is not configured." };
  }

  const params = new URLSearchParams({
    To: args.toE164,
    From: cfg.smsFrom,
    Body: args.body,
  });

  let res: Response;
  try {
    res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      cache: "no-store",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to send SMS: ${message}` };
  }

  const payload = (await res.json().catch(() => null)) as Record<string, unknown> | null;

  if (!res.ok) {
    const twilioMsg =
      payload && typeof payload.message === "string"
        ? payload.message
        : `Twilio returned HTTP ${res.status}`;
    return { ok: false, error: twilioMsg };
  }

  const sid = payload && typeof payload.sid === "string" ? payload.sid : "";
  if (!sid) {
    return { ok: false, error: "Twilio did not return a message SID." };
  }

  return { ok: true, sid };
}
