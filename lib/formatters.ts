export function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function timeAgo(timestamp: number | string | Date) {
  const date = new Date(
    typeof timestamp === "number" && timestamp < 1_000_000_0000
      ? timestamp * 1000
      : timestamp,
  );
  let seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 0) seconds = 0;

  const intervals = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
    { label: "minute", seconds: 60 },
    { label: "second", seconds: 1 },
  ];

  for (let i = 0; i < intervals.length; i++) {
    const interval = intervals[i];
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count !== 1 ? "s" : ""} ago`;
    }
  }
  return "just now";
}

export function truncateId(id: string, length = 12) {
  if (!id) return "";
  const cleanId = id.startsWith("sha256:") ? id.substring(7) : id;
  return cleanId.substring(0, length);
}
