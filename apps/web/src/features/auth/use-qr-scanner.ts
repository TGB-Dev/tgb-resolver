import { onScopeDispose, ref } from "vue";
import wasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";

interface DetectedCode {
  rawValue: string;
}

interface QrDetector {
  detect(source: CanvasImageSource): Promise<DetectedCode[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => QrDetector;
  }
}

export function useQrScanner() {
  const error = ref<string | null>(null);
  const scanning = ref(false);

  async function createDetector(): Promise<QrDetector> {
    if (typeof window !== "undefined" && window.BarcodeDetector) {
      return new window.BarcodeDetector({ formats: ["qr_code"] });
    }
    const { BarcodeDetector, prepareZXingModule } = await import("barcode-detector/ponyfill");
    prepareZXingModule({
      overrides: {
        locateFile: (path: string, prefix: string) =>
          path.endsWith(".wasm") ? String(wasmUrl) : prefix + path,
      },
    });
    return new BarcodeDetector({ formats: ["qr_code"] }) as QrDetector;
  }

  async function pollDetector(
    video: HTMLVideoElement,
    detector: QrDetector,
    isCancelled: () => boolean,
  ): Promise<string | null> {
    while (!isCancelled()) {
      const codes = await detector.detect(video);
      const first = codes[0]?.rawValue;
      if (first) return first;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return null;
  }

  async function scanOnce(video: HTMLVideoElement, onCode: (code: string) => void) {
    error.value = null;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    let cancelled = false;
    const stopStream = () => {
      cancelled = true;
      for (const track of stream.getTracks()) {
        track.stop();
      }
      scanning.value = false;
    };
    onScopeDispose(stopStream);
    video.srcObject = stream;
    await video.play();
    scanning.value = true;
    const detector = await createDetector();
    try {
      const found = await pollDetector(video, detector, () => cancelled);
      if (found && !cancelled) onCode(found);
    } catch (e) {
      if (!cancelled) error.value = e instanceof Error ? e.message : String(e);
    }
    stopStream();
  }

  return { error, scanning, scanOnce };
}
