import { useCallback, useEffect, useRef, useState } from "react";
import { fetchNarration } from "../utils/api.js";

const SUPPORTS_SPEECH =
  typeof window !== "undefined" && "speechSynthesis" in window;

// Fetches a stop's narration from the backend and reads it aloud via the Web
// Speech API. This is the React glue that used to live in GuideMode: it tracks
// which stop is active, whether we're still fetching its text, and whether
// speech is currently playing. Narration text is cached per stop so replaying
// (or re-listening) doesn't hit the backend again.
export function useNarration(city) {
  const [active, setActive] = useState(null); // { name, text } currently shown
  const [loadingName, setLoadingName] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState(null);
  const cacheRef = useRef(new Map()); // stopName -> narration text

  const stop = useCallback(() => {
    if (SUPPORTS_SPEECH) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text) => {
    if (!SUPPORTS_SPEECH) {
      setError("Speech synthesis isn't supported on this device.");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);

  // Fetch (or reuse cached) narration for a stop and read it aloud. Resolves to
  // the stop name on success so callers can mark it as visited.
  const play = useCallback(
    async (stopName) => {
      setError(null);
      try {
        let text = cacheRef.current.get(stopName);
        if (!text) {
          setLoadingName(stopName);
          text = await fetchNarration(stopName, city);
          cacheRef.current.set(stopName, text);
        }
        setActive({ name: stopName, text });
        speak(text);
        return stopName;
      } catch (err) {
        setError(err.message);
        return null;
      } finally {
        setLoadingName(null);
      }
    },
    [city, speak]
  );

  // Stop any in-flight speech if the component using this hook unmounts.
  useEffect(() => stop, [stop]);

  return { active, loadingName, speaking, error, play, stop };
}
