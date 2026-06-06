"use client";

import { useEffect, useRef } from "react";

type Ripple = {
  x: number;
  y: number;
  born: number;
  duration: number;
  maxRadius: number;
  r: number;
  g: number;
  b: number;
};

const RIPPLE_COLORS: Array<[number, number, number]> = [
  [99, 102, 241],
  [129, 140, 248],
  [167, 139, 250],
  [192, 132, 252],
  [244, 114, 182],
];

function pickRippleColor(): [number, number, number] {
  return RIPPLE_COLORS[Math.floor(Math.random() * RIPPLE_COLORS.length)];
}

function drawBaseGradient(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#020617");
  gradient.addColorStop(0.45, "#0f172a");
  gradient.addColorStop(1, "#1e1b4b");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  const topGlow = context.createRadialGradient(
    width * 0.2,
    height * 0.08,
    0,
    width * 0.2,
    height * 0.08,
    Math.max(width, height) * 0.55,
  );
  topGlow.addColorStop(0, "rgba(99, 102, 241, 0.14)");
  topGlow.addColorStop(1, "rgba(99, 102, 241, 0)");
  context.fillStyle = topGlow;
  context.fillRect(0, 0, width, height);

  const bottomGlow = context.createRadialGradient(
    width * 0.82,
    height * 0.92,
    0,
    width * 0.82,
    height * 0.92,
    Math.max(width, height) * 0.5,
  );
  bottomGlow.addColorStop(0, "rgba(129, 140, 248, 0.1)");
  bottomGlow.addColorStop(1, "rgba(129, 140, 248, 0)");
  context.fillStyle = bottomGlow;
  context.fillRect(0, 0, width, height);
}

export default function OnboardingRippleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ripplesRef = useRef<Ripple[]>([]);
  const frameRef = useRef<number>(0);
  const lastSpawnRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const { innerWidth, innerHeight } = window;
      canvas.width = Math.floor(innerWidth * dpr);
      canvas.height = Math.floor(innerHeight * dpr);
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawBaseGradient(context, innerWidth, innerHeight);
    }

    function spawnRipple(clientX: number, clientY: number) {
      const [r, g, b] = pickRippleColor();
      ripplesRef.current.push({
        x: clientX,
        y: clientY,
        born: performance.now(),
        duration: 1500 + Math.random() * 500,
        maxRadius: 120 + Math.random() * 180,
        r,
        g,
        b,
      });

      if (ripplesRef.current.length > 24) {
        ripplesRef.current.splice(0, ripplesRef.current.length - 24);
      }
    }

    function onPointerMove(event: PointerEvent) {
      const now = performance.now();
      if (now - lastSpawnRef.current < 48) {
        return;
      }
      lastSpawnRef.current = now;
      spawnRipple(event.clientX, event.clientY);
    }

    function onPointerDown(event: PointerEvent) {
      spawnRipple(event.clientX, event.clientY);
    }

    function render(now: number) {
      const width = window.innerWidth;
      const height = window.innerHeight;

      drawBaseGradient(context, width, height);

      ripplesRef.current = ripplesRef.current.filter((ripple) => {
        const progress = Math.min(Math.max((now - ripple.born) / ripple.duration, 0), 1);
        if (progress >= 1) {
          return false;
        }

        const radius = Math.max(0, ripple.maxRadius * progress);
        if (radius <= 0) {
          return true;
        }

        const innerRadius = 0;
        const outerRadius = Math.max(innerRadius + 0.001, radius);
        const alpha = (1 - progress) * 0.22;
        const gradient = context.createRadialGradient(
          ripple.x,
          ripple.y,
          innerRadius,
          ripple.x,
          ripple.y,
          outerRadius,
        );

        gradient.addColorStop(
          0,
          `rgba(${ripple.r}, ${ripple.g}, ${ripple.b}, ${alpha})`,
        );
        gradient.addColorStop(
          0.45,
          `rgba(${ripple.r}, ${ripple.g}, ${ripple.b}, ${alpha * 0.35})`,
        );
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        context.fillStyle = gradient;
        context.beginPath();
        context.arc(ripple.x, ripple.y, outerRadius, 0, Math.PI * 2);
        context.fill();

        return true;
      });

      frameRef.current = window.requestAnimationFrame(render);
    }

    resize();
    frameRef.current = window.requestAnimationFrame(render);

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });

    return () => {
      window.cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
    />
  );
}
