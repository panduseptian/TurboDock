"use client";

import { useId, useMemo } from "react";

interface ContainerStatsChartProps {
  data: number[];
  maxDataPoints?: number;
  label: string;
  value: string;
  color: string;
  height?: number;
}

interface ChartPoint {
  x: number;
  y: number;
}

export function ContainerStatsChart({
  data,
  maxDataPoints = 60,
  label,
  value,
  color,
  height = 80,
}: Readonly<ContainerStatsChartProps>) {
  const gradientId = useId().replaceAll(":", "");

  const { points, linePath, areaPath, hasData } = useMemo(() => {
    const limit = Math.max(1, maxDataPoints);
    const slice = data.slice(-limit);

    if (slice.length === 0) {
      return {
        points: [] as ChartPoint[],
        linePath: "",
        areaPath: "",
        hasData: false,
      };
    }

    const normalized = slice.map((valuePoint) => Math.max(0, valuePoint));
    const max = Math.max(...normalized, 1); // Prevent divide-by-zero for all-zero data.
    const width = 100;
    const usableHeight = height * 0.85;
    const denominator = Math.max(normalized.length - 1, 1);

    const builtPoints = normalized.map((valuePoint, index) => {
      const x = (index / denominator) * width;
      const y = height - (valuePoint / max) * usableHeight;
      return { x, y };
    });

    const lineSegments = builtPoints
      .map((point) => `${point.x} ${point.y}`)
      .join(" L ");
    const line =
      builtPoints.length === 1
        ? `M ${builtPoints[0].x} ${builtPoints[0].y} L ${builtPoints[0].x} ${builtPoints[0].y}`
        : `M ${lineSegments}`;

    const firstX = builtPoints[0].x;
    const lastPoint = builtPoints.at(-1) ?? builtPoints[0];
    const lastX = lastPoint.x;
    const area = `M ${firstX} ${height} L ${builtPoints
      .map((point) => `${point.x} ${point.y}`)
      .join(" L ")} L ${lastX} ${height} Z`;

    return {
      points: builtPoints,
      linePath: line,
      areaPath: area,
      hasData: true,
    };
  }, [data, maxDataPoints, height]);

  return (
    <div className="bg-surface-container-low p-3 rounded-lg">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-mono uppercase text-on-surface-variant">
          {label}
        </p>
        <p className="text-sm font-mono text-on-surface">{value}</p>
      </div>

      <div className="relative">
        <svg
          className="block h-auto w-full"
          height={height}
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
          aria-label={`${label} chart`}
        >
          <title>{`${label} chart`}</title>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7bd0ff" stopOpacity={0.1} />
              <stop offset="100%" stopColor="#7bd0ff" stopOpacity={0.02} />
            </linearGradient>
            <pattern
              id={`grid-${gradientId}`}
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 10 0 L 0 0 0 10"
                fill="none"
                stroke="#2d3449"
                strokeWidth="0.5"
                strokeOpacity="0.3"
              />
            </pattern>
          </defs>

          <rect width="100" height={height} fill={`url(#grid-${gradientId})`} />

          {hasData && areaPath && (
            <path d={areaPath} fill={`url(#${gradientId})`} />
          )}

          {hasData && linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#7bd0ff"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {hasData && points.length === 1 && (
            <circle cx={points[0].x} cy={points[0].y} r={1.8} fill="#7bd0ff" />
          )}
        </svg>

        {!hasData && (
          <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-on-surface-variant/50">
            WAITING FOR DATA...
          </div>
        )}
      </div>
    </div>
  );
}
