import type { CarrierKey } from "@/lib/call-forwarding-carriers";

export function cleanPhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits;
  if (digits.length === 10) return `1${digits}`;
  return digits;
}

export function toE164Us(phone: string): string | null {
  const digits = cleanPhoneDigits(phone);
  if (digits.length !== 11 || !digits.startsWith("1")) return null;
  return `+${digits}`;
}

export function formatDisplayNumber(phone: string): string {
  const d = cleanPhoneDigits(phone);
  if (d.length === 11 && d.startsWith("1")) {
    return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  }
  return phone.trim();
}

export function buildForwardingDialCodes(args: {
  carrier: CarrierKey;
  aiLineNumber: string;
  ringSeconds: number;
}): {
  activationCode: string;
  deactivationCode: string;
  encodedTelUri: string;
  supportsDialCodes: boolean;
} {
  const normalizedDigits = cleanPhoneDigits(args.aiLineNumber);

  if (args.carrier === "landline_voip" || args.carrier === "google_voice") {
    return {
      activationCode: "",
      deactivationCode: "",
      encodedTelUri: "",
      supportsDialCodes: false,
    };
  }

  if (args.carrier === "att_tmobile") {
    const activationCode = `**61*${normalizedDigits}**${args.ringSeconds}#`;
    return {
      activationCode,
      deactivationCode: "##61#",
      encodedTelUri: `tel:**61*${normalizedDigits}**${args.ringSeconds}%23`,
      supportsDialCodes: true,
    };
  }

  const activationCode = `*71${normalizedDigits}`;
  return {
    activationCode,
    deactivationCode: "*73",
    encodedTelUri: `tel:*71${normalizedDigits}`,
    supportsDialCodes: true,
  };
}

export function buildForwardingSmsBody(args: {
  activationCode: string;
  deactivationCode: string;
  aiLineDisplay: string;
  setupUrl: string;
}): string {
  // Keep GSM-7 friendly (no em dashes / fancy unicode) so carriers
  // stay on 160-char segments instead of falling back to UCS-2.
  const lines = [
    "VyntRise Technologies: Activate AI call forwarding",
    "",
    "Dial this code from your business phone:",
    args.activationCode,
    "",
    `AI line: ${args.aiLineDisplay}`,
  ];

  if (args.deactivationCode) {
    lines.push("", "To turn off later, dial:", args.deactivationCode);
  }

  lines.push(
    "",
    "iPhone: copy the dial code, paste into the Phone keypad, then Call.",
    `Guide: ${args.setupUrl}`,
    "",
    "Msg & data rates may apply. Reply STOP to opt out, HELP for help.",
  );

  return lines.join("\n");
}
