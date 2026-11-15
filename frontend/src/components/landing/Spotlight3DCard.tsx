"use client";

import React, { useRef, useState } from "react";

interface Spotlight3DCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  maxTilt?: number;
  highlighted?: boolean;
}

export function Spotlight3DCard({
  children,
  className = "",
  glowColor = "rgba(132, 204, 22, 0.16)",
  maxTilt = 5,
  highlighted = false,
}: Spotlight3DCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateY = ((x - centerX) / centerX) * maxTilt;
    const rotateX = -((y - centerY) / centerY) * maxTilt;

    setCoords({ x, y });
    setTilt({ rotateX, rotateY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ rotateX: 0, rotateY: 0 });
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: isHovered
          ? `perspective(1100px) rotateX(${tilt.rotateX.toFixed(2)}deg) rotateY(${tilt.rotateY.toFixed(2)}deg) translateZ(4px)`
          : "perspective(1100px) rotateX(0deg) rotateY(0deg) translateZ(0px)",
        transition: isHovered
          ? "transform 110ms ease-out, border-color 300ms ease"
          : "transform 450ms cubic-bezier(0.22, 1, 0.36, 1), border-color 300ms ease",
      }}
      className={`group relative overflow-hidden rounded-2xl border backdrop-blur-xl ${
        highlighted
          ? "border-[#84CC16]/60 bg-gradient-to-br from-[#141A10] via-[#121215] to-[#0D0D10] shadow-[0_0_45px_rgba(132,204,22,0.16)]"
          : "border-zinc-800/90 bg-[#121215]/90 hover:border-[#84CC16]/50"
      } ${className}`}
    >
      {/* Dynamic Cursor-Following Electric Lime Spotlight */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(480px circle at ${coords.x}px ${coords.y}px, ${glowColor}, transparent 65%)`,
        }}
      />

      {/* Top Subtle Neon Edge Line */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#84CC16] to-transparent transition-opacity duration-300 ${
          highlighted || isHovered ? "opacity-100" : "opacity-30"
        }`}
      />

      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}