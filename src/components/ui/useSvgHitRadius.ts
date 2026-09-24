import { useEffect, useState, type RefObject } from 'react';

/** Convert a 25 px hit target to SVG units as the canvas resizes. */
export function useSvgHitRadius(svgRef: RefObject<SVGSVGElement | null>, viewWidth: number, viewHeight: number, visibleRadius: number) {
  const [scale, setScale] = useState<number | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const update = () => {
      const rect = svg.getBoundingClientRect();
      const next = Math.min(rect.width / viewWidth, rect.height / viewHeight);
      if (Number.isFinite(next) && next > 0) setScale(next);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [svgRef, viewWidth, viewHeight]);

  return scale ? Math.max(visibleRadius, 12.5 / scale) : visibleRadius;
}
