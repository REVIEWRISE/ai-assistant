export type CarrierKey =
  | "att_tmobile"
  | "verizon"
  | "spectrum_xfinity"
  | "uscellular"
  | "landline_voip"
  | "google_voice";

export type CarrierOption = {
  key: CarrierKey;
  label: string;
  sublabel: string;
  badge: string;
};

export const CALL_FORWARDING_CARRIERS: CarrierOption[] = [
  {
    key: "att_tmobile",
    label: "AT&T / T-Mobile",
    sublabel: "Also Mint, Metro, Cricket",
    badge: "GSM",
  },
  {
    key: "verizon",
    label: "Verizon",
    sublabel: "Also Visible, Total Wireless",
    badge: "CDMA",
  },
  {
    key: "spectrum_xfinity",
    label: "Spectrum / Xfinity",
    sublabel: "Cable MVNOs",
    badge: "Star code",
  },
  {
    key: "uscellular",
    label: "US Cellular / C-Spire",
    sublabel: "Regional wireless",
    badge: "Star code",
  },
  {
    key: "landline_voip",
    label: "VoIP / Landline",
    sublabel: "Comcast, Vonage, RingCentral",
    badge: "Portal",
  },
  {
    key: "google_voice",
    label: "Google Voice",
    sublabel: "Cloud telephony",
    badge: "Web",
  },
];

export function isCarrierKey(value: string): value is CarrierKey {
  return CALL_FORWARDING_CARRIERS.some((c) => c.key === value);
}

/** Map Twilio Line Type Intelligence to our forwarding carrier preset. */
export function mapCarrierFromLineIntelligence(input: {
  carrierName: string | null | undefined;
  lineType: string | null | undefined;
}): {
  carrierKey: CarrierKey;
  confidence: "high" | "medium" | "low";
  summary: string;
} {
  const name = (input.carrierName ?? "").toLowerCase();
  const type = (input.lineType ?? "").toLowerCase();

  if (name.includes("google")) {
    return {
      carrierKey: "google_voice",
      confidence: "high",
      summary: "Google Voice / cloud telephony",
    };
  }

  const voipLike =
    type.includes("voip") ||
    type === "landline" ||
    type === "fixedvoip" ||
    type === "nonfixedvoip" ||
    name.includes("vonage") ||
    name.includes("ringcentral") ||
    name.includes("8x8") ||
    name.includes("comcast");

  if (voipLike && !name.includes("verizon") && !name.includes("t-mobile") && !name.includes("at&t")) {
    return {
      carrierKey: "landline_voip",
      confidence: "medium",
      summary: "VoIP or landline — use your provider portal",
    };
  }

  if (
    name.includes("t-mobile") ||
    name.includes("tmobile") ||
    name.includes("at&t") ||
    name.includes("at&t mobility") ||
    name.includes("att ") ||
    name.includes("cricket") ||
    name.includes("metro") ||
    name.includes("mint mobile")
  ) {
    return {
      carrierKey: "att_tmobile",
      confidence: "high",
      summary: input.carrierName?.trim() || "AT&T / T-Mobile network",
    };
  }

  if (name.includes("verizon") || name.includes("visible")) {
    return {
      carrierKey: "verizon",
      confidence: "high",
      summary: input.carrierName?.trim() || "Verizon Wireless",
    };
  }

  if (name.includes("spectrum") || name.includes("xfinity") || name.includes("comcast")) {
    return {
      carrierKey: "spectrum_xfinity",
      confidence: "medium",
      summary: input.carrierName?.trim() || "Spectrum / Xfinity Mobile",
    };
  }

  if (name.includes("u.s. cellular") || name.includes("us cellular") || name.includes("c-spire") || name.includes("cspire")) {
    return {
      carrierKey: "uscellular",
      confidence: "high",
      summary: input.carrierName?.trim() || "US Cellular / regional",
    };
  }

  if (type === "mobile" || type === "personal") {
    return {
      carrierKey: "att_tmobile",
      confidence: "low",
      summary: input.carrierName?.trim()
        ? `${input.carrierName} (mobile — confirm carrier below)`
        : "Mobile line — confirm your carrier preset",
    };
  }

  return {
    carrierKey: "landline_voip",
    confidence: "low",
    summary: input.carrierName?.trim()
      ? `${input.carrierName} — confirm line type below`
      : "Could not identify carrier — choose manually",
  };
}
