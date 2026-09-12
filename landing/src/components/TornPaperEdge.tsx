import React, { useMemo } from 'react';

interface TornPaperEdgeProps {
  splitPercent: number; // e.g. 50.2
  height?: number | string;
  className?: string;
  isDragging?: boolean;
}

export const TornPaperEdge: React.FC<TornPaperEdgeProps> = ({
  splitPercent,
  className = '',
}) => {
  // Pre-calculated organic ripped paper contour points (normalized coordinates 0 to 1000 Y)
  const baseJitterPoints = useMemo(() => [
    { y: 0, dx: -0.2 },
    { y: 35, dx: -0.4 },
    { y: 70, dx: 0.3 },
    { y: 110, dx: -0.1 },
    { y: 155, dx: 0.6 },
    { y: 190, dx: 0.1 },
    { y: 230, dx: -0.5 },
    { y: 275, dx: 0.4 },
    { y: 320, dx: 0.8 },
    { y: 360, dx: 0.2 },
    { y: 400, dx: -0.3 },
    { y: 440, dx: 0.5 },
    { y: 480, dx: -0.6 },
    { y: 520, dx: 0.2 },
    { y: 565, dx: -0.4 },
    { y: 610, dx: 0.7 },
    { y: 650, dx: 0.1 },
    { y: 695, dx: -0.7 },
    { y: 740, dx: 0.3 },
    { y: 780, dx: -0.2 },
    { y: 825, dx: 0.6 },
    { y: 870, dx: -0.5 },
    { y: 915, dx: 0.2 },
    { y: 955, dx: -0.3 },
    { y: 1000, dx: 0.4 },
  ], []);

  // Build SVG path string based on splitPercent
  const tearLinePath = useMemo(() => {
    // Width is mapped to 1000 units in SVG coordinate space
    const centerNorm = splitPercent * 10; // e.g. 50.2 * 10 = 502

    let dLine = `M ${centerNorm + baseJitterPoints[0].dx * 10} 0`;
    for (let i = 1; i < baseJitterPoints.length; i++) {
      const pt = baseJitterPoints[i];
      const prev = baseJitterPoints[i - 1];
      const cx = (centerNorm + prev.dx * 10 + centerNorm + pt.dx * 10) / 2;
      const cy = (prev.y + pt.y) / 2;
      // Slight curve for organic paper tear feel
      dLine += ` Q ${cx} ${cy} ${centerNorm + pt.dx * 10} ${pt.y}`;
    }

    return dLine;
  }, [splitPercent, baseJitterPoints]);

  return (
    <div className={`absolute inset-0 pointer-events-none z-20 ${className}`}>
      <svg
        className="w-full h-full"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Paper fiber displacement filter */}
          <filter id="tornFiber" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.08 0.4"
              numOctaves="4"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="5"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>

          {/* Deep paper shadow on the torn edge */}
          <filter id="tearShadow" x="-30%" y="-10%" width="160%" height="120%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur1" />
            <feOffset in="blur1" dx="-4" dy="0" result="offset1" />
            <feComponentTransfer in="offset1" result="shadow1">
              <feFuncA type="linear" slope="0.35" />
            </feComponentTransfer>
            
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur2" />
            <feOffset in="blur2" dx="-1" dy="0" result="offset2" />
            <feComponentTransfer in="offset2" result="shadow2">
              <feFuncA type="linear" slope="0.5" />
            </feComponentTransfer>

            <feMerge>
              <feMergeNode in="shadow1" />
              <feMergeNode in="shadow2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer Shadow of the torn paper */}
        <path
          d={tearLinePath}
          fill="none"
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="12"
          filter="url(#tornFiber)"
          opacity="0.6"
        />

        {/* White Frayed Deckle Fiber Edge */}
        <path
          d={tearLinePath}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="6"
          filter="url(#tornFiber)"
        />

        {/* Sharp inner crisp rip line */}
        <path
          d={tearLinePath}
          fill="none"
          stroke="#F2F2F2"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
};
