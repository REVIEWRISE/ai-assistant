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
  encodedTelUri: string;
  aiLineDisplay: string;
  setupUrl: string;
}): string {
  const lines = [
    "VyntRise — activate AI call forwarding for missed business calls.",
    "",
    `Dial from your business phone: ${args.activationCode}`,
    `AI line: ${args.aiLineDisplay}`,
  ];

  if (args.deactivationCode) {
    lines.push(`Turn off forwarding: ${args.deactivationCode}`);
  }

  if (args.encodedTelUri.startsWith("tel:")) {
    lines.push("", `Android tap-to-dial: ${args.encodedTelUri}`);
  }

  lines.push("", `Setup guide: ${args.setupUrl}`);
  return lines.join("\n");
}
