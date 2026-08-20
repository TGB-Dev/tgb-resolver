export function formatTime(submissionTimeSinceStartSeconds: number): string {
  const totalSeconds = Math.floor(submissionTimeSinceStartSeconds);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / (60 * 60));
  return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
