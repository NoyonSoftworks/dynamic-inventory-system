"use client";

import { useState } from "react";
import Link from "next/link";

// ── 1. SVG DONUT RING CHART (180px) ───────────────────────────
export function OrderStatusDonutChart({
  delivered = 0,
  inTransit = 0,
  pending = 0,
  returned = 0,
}) {
  const total = delivered + inTransit + pending + returned;

  const data = [
    { label: "Delivered", count: delivered, color: "#10B981" },
    { label: "In Transit", count: inTransit, color: "#3B82F6" },
    { label: "Pending", count: pending, color: "#F59E0B" },
    { label: "Returned/RTO", count: returned, color: "#F43F5E" },
  ];

  // Circle parameters: radius 65 => circumference = 2 * PI * 65 ≈ 408.407
  const radius = 65;
  const circumference = 2 * Math.PI * radius;

  // Compute strokeDasharray and offsets
  let cumulativePct = 0;
  const segments = data.map((item) => {
    const pct = total > 0 ? item.count / total : 0;
    const strokeLength = pct * circumference;
    const offset = circumference - cumulativePct * circumference;
    cumulativePct += pct;
    return {
      ...item,
      pct: total > 0 ? Math.round(pct * 100) : 0,
      strokeLength,
      offset,
    };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
      {/* 180px SVG Donut Ring */}
      <div className="relative w-[180px] h-[180px] shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90 transform">
          {/* Background Track Circle */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="transparent"
            stroke="#F1F5F9"
            strokeWidth="20"
          />

          {/* Slices */}
          {total > 0 &&
            segments.map((seg, idx) => (
              <circle
                key={idx}
                cx="90"
                cy="90"
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth="20"
                strokeDasharray={`${seg.strokeLength} ${circumference - seg.strokeLength}`}
                strokeDashoffset={-seg.offset}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
              />
            ))}
        </svg>

        {/* Center Total Number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-3xl font-bold tracking-tight text-slate-900 font-sans">
            {total}
          </span>
          <span className="text-[11px] text-slate-400 font-medium mt-0.5">
            Total orders
          </span>
        </div>
      </div>

      {/* Right Legend */}
      <div className="flex-1 w-full space-y-2.5">
        {segments.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-slate-600 font-medium">{item.label}</span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="font-semibold text-slate-900">{item.count}</span>
              <span className="text-slate-400 text-[11px]">({item.pct}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 2. SVG DUAL-AXIS REVENUE & ORDERS CHART ────────────────────
export function RevenueOrdersDualAxisChart({ chartData = [] }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Fallback 7-day baseline if no data
  const defaultDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const points = defaultDays.map((day, idx) => {
    const match = chartData[idx];
    return {
      day,
      revenue: match ? match.revenue : 0,
      orders: match ? match.orders : 0,
    };
  });

  const maxRevenue = Math.max(...points.map((p) => p.revenue), 1000);
  const maxOrders = Math.max(...points.map((p) => p.orders), 4);

  // SVG Chart bounds
  const width = 500;
  const height = 180;
  const padLeft = 45;
  const padRight = 30;
  const padBottom = 25;
  const padTop = 15;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;
  const stepX = chartW / (points.length - 1 || 1);

  // Generate line path coordinates for Orders line
  const linePoints = points.map((p, i) => {
    const x = padLeft + i * stepX;
    const y = padTop + chartH - (p.orders / maxOrders) * chartH;
    return `${x},${y}`;
  });
  const pathD = `M ${linePoints.join(" L ")}`;

  return (
    <div className="relative w-full overflow-hidden select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
      >
        {/* Horizontal Dashed Gridlines (5 Levels) */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padTop + chartH * (1 - ratio);
          const revVal = Math.round(maxRevenue * ratio);
          const ordVal = Math.round(maxOrders * ratio);

          return (
            <g key={ratio}>
              {/* Left Y-Axis Label (Revenue ৳) */}
              <text
                x={padLeft - 8}
                y={y + 3}
                textAnchor="end"
                className="text-[10px] font-mono fill-slate-400"
              >
                {revVal >= 1000 ? `৳${(revVal / 1000).toFixed(1)}k` : `৳${revVal}`}
              </text>

              {/* Dashed Grid Line */}
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="#E2E8F0"
                strokeDasharray="3 3"
                strokeWidth="1"
              />

              {/* Right Y-Axis Label (Orders count) */}
              <text
                x={width - padRight + 8}
                y={y + 3}
                textAnchor="start"
                className="text-[10px] font-mono fill-slate-400"
              >
                {ordVal}
              </text>
            </g>
          );
        })}

        {/* Revenue Bars */}
        {points.map((p, i) => {
          const x = padLeft + i * stepX - 10;
          const barH = (p.revenue / maxRevenue) * chartH;
          const y = padTop + chartH - barH;
          const isHovered = hoveredIndex === i;

          return (
            <g
              key={i}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Vertical Bar */}
              <rect
                x={x}
                y={y}
                width="20"
                height={Math.max(barH, 3)}
                rx="3"
                ry="3"
                fill={isHovered ? "#2563EB" : "#93C5FD"}
                className="transition-colors duration-150"
              />

              {/* X-Axis Day Label */}
              <text
                x={padLeft + i * stepX}
                y={height - 6}
                textAnchor="middle"
                className={`text-[10px] font-mono ${
                  isHovered ? "fill-slate-900 font-bold" : "fill-slate-400"
                }`}
              >
                {p.day}
              </text>
            </g>
          );
        })}

        {/* Orders Line Trend */}
        <path
          d={pathD}
          fill="none"
          stroke="#0F172A"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Orders Data Points */}
        {points.map((p, i) => {
          const x = padLeft + i * stepX;
          const y = padTop + chartH - (p.orders / maxOrders) * chartH;
          const isHovered = hoveredIndex === i;

          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={isHovered ? 5 : 3.5}
              fill="#FFFFFF"
              stroke="#0F172A"
              strokeWidth="2"
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          );
        })}
      </svg>

      {/* Hover Floating Card */}
      {hoveredIndex !== null && (
        <div
          className="absolute top-2 z-10 bg-slate-900 text-white text-[11px] font-mono rounded-lg px-2.5 py-1.5 shadow-md pointer-events-none transition-all"
          style={{
            left: `${((padLeft + hoveredIndex * stepX) / width) * 100}%`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="font-semibold text-slate-200">{points[hoveredIndex].day}</div>
          <div className="text-blue-400 font-medium">
            Revenue: ৳{points[hoveredIndex].revenue.toLocaleString()}
          </div>
          <div className="text-slate-300">
            Orders: {points[hoveredIndex].orders}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 3. ORDER SOURCES & ACQUISITION CHANNELS LIST ───────────────
export function OrderSourcesList({ sources = [] }) {
  const defaultSources = [
    { name: "Website / Store", color: "#8B5CF6", count: 0, pct: 0 },
    { name: "Facebook Messenger", color: "#3B82F6", count: 0, pct: 0 },
    { name: "WhatsApp Direct", color: "#10B981", count: 0, pct: 0 },
    { name: "Steadfast Courier", color: "#F97316", count: 0, pct: 0 },
    { name: "Pathao Courier", color: "#EF4444", count: 0, pct: 0 },
  ];

  const list = defaultSources.map((item) => {
    const match = sources.find((s) => s.name.toLowerCase() === item.name.toLowerCase());
    return match ? { ...item, count: match.count, pct: match.pct } : item;
  });

  return (
    <div className="space-y-4">
      {list.map((src) => (
        <div key={src.name} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: src.color }}
              />
              <span className="font-medium text-slate-700">{src.name}</span>
            </div>
            <div className="font-mono text-slate-500 text-[11px]">
              <span className="font-semibold text-slate-900">{src.count}</span> ({src.pct.toFixed(1)}%)
            </div>
          </div>

          {/* Slim Progress Bar */}
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.max(src.pct, 0)}%`,
                backgroundColor: src.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 4. TOP PRODUCTS & STOCK ALERTS LIST ────────────────────────
export function TopProductsList({ products = [] }) {
  if (!products || products.length === 0) {
    return (
      <div className="py-10 text-center space-y-3">
        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <div className="text-xs text-slate-400">
          No product sales recorded in this period.
        </div>
        <Link
          href="/dashboard/products/add"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline"
        >
          <span>+ Add product to catalog</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {products.slice(0, 5).map((p, idx) => (
        <div key={p.id || idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 font-mono text-[10px] flex items-center justify-center shrink-0">
              0{idx + 1}
            </span>
            <div className="min-w-0">
              <div className="font-semibold text-slate-900 truncate">
                {p.name}
              </div>
              <div className="text-[11px] text-slate-400 font-mono truncate">
                {p.category || "General"} · {p.inStockCount ?? p.stock_quantity ?? 0} in stock
              </div>
            </div>
          </div>

          <div className="text-right shrink-0 font-mono">
            <div className="font-semibold text-slate-900">
              ৳{Number(p.price || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400">
              {p.unitsSold || 0} sold
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
