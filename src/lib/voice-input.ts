type SpeechRecognitionResultEvent = {
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionErrorEvent = {
  error: string;
};

export type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionCtor = new () => BrowserSpeechRecognition;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() != null;
}

export function mapSpeechRecognitionError(error: string): string {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access was blocked. Allow the mic in your browser to use voice booking.";
    case "no-speech":
      return "No speech detected. Tap the mic and try again.";
    case "audio-capture":
      return "No microphone was found.";
    case "network":
      return "Voice recognition needs a network connection.";
    case "aborted":
      return "";
    default:
      return "Could not recognize speech. Try again.";
  }
}

export type StartVoiceListenArgs = {
  language: string;
  onFinalTranscript: (text: string) => void;
  onError?: (message: string) => void;
  onListeningChange?: (listening: boolean) => void;
};

let activeRecognition: BrowserSpeechRecognition | null = null;

export function stopVoiceListen(): void {
  if (!activeRecognition) return;
  activeRecognition.onresult = null;
  activeRecognition.onerror = null;
  activeRecognition.onend = null;
  activeRecognition.abort();
  activeRecognition = null;
}

export function startVoiceListen(args: StartVoiceListenArgs): boolean {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    args.onError?.("Voice input is not supported in this browser.");
    return false;
  }

  stopVoiceListen();

  const recognition = new Ctor();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = args.language;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = event.results[0]?.[0]?.transcript?.trim() ?? "";
    if (transcript) args.onFinalTranscript(transcript);
  };

  recognition.onerror = (event) => {
    const message = mapSpeechRecognitionError(event.error);
    if (message) args.onError?.(message);
    args.onListeningChange?.(false);
    activeRecognition = null;
  };

  recognition.onend = () => {
    args.onListeningChange?.(false);
    activeRecognition = null;
  };

  try {
    recognition.start();
    activeRecognition = recognition;
    args.onListeningChange?.(true);
    return true;
  } catch {
    args.onError?.("Could not start voice recognition.");
    activeRecognition = null;
    return false;
  }
}
