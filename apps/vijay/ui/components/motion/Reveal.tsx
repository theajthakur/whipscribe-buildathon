"use client";

import React, { useEffect, useRef } from "react";
import { getGsap } from "@/lib/gsap";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  yOffset?: number;
  duration?: number;
}

export function Reveal({
  children,
  className = "",
  delay = 0,
  yOffset = 30,
  duration = 0.8,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { gsap, ScrollTrigger } = getGsap();
    if (!ref.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current,
        {
          opacity: 0,
          y: yOffset,
        },
        {
          opacity: 1,
          y: 0,
          duration,
          delay,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ref.current,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );
    }, ref);

    return () => ctx.revert();
  }, [delay, duration, yOffset]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
