import { Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useControlElapsedTimeStore } from "@/stores/control-elapsed-time.store";

export function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);

  return now;
}

function formatHms(date: Date): string {
  return date.toLocaleTimeString("en-GB", { hour12: false });
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.max(0, Math.floor(totalSeconds / 3600));
  const minutes = Math.max(0, Math.floor((totalSeconds % 3600) / 60));
  const seconds = Math.max(0, totalSeconds % 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function ControlCurrentTime({ now }: { now: number }) {
  return (
    <Text fontFamily="mono" fontVariantNumeric="tabular-nums">
      {formatHms(new Date(now))}
    </Text>
  );
}

export function ControlElapsedTime({ now }: { now: number }) {
  const startedAt = useControlElapsedTimeStore((s) => s.startedAt);
  const isStarted = startedAt !== null;
  const elapsedMs = isStarted ? now - startedAt : 0;

  return (
    <Text
      fontSize="3xl"
      fontFamily="mono"
      fontVariantNumeric="tabular-nums"
      opacity={isStarted ? 1 : 0.5}
    >
      T+{isStarted ? formatElapsed(elapsedMs) : "--:--:--"}
    </Text>
  );
}
