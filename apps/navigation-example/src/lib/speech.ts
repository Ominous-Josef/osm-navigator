import * as Speech from 'expo-speech';

/** Speak `text`, interrupting any prompt still playing. Never throws (TTS may be missing). */
export function speak(text: string): void {
  try {
    void Speech.stop();
    Speech.speak(text);
  } catch {
    // No TTS engine available: navigation still works silently.
  }
}

export function stopSpeaking(): void {
  try {
    void Speech.stop();
  } catch {
    // Ignore: nothing to stop.
  }
}
