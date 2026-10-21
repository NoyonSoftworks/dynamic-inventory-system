"use client";

import { useState } from "react";

// ── 1. TENANT STATUS DONUT CHART (180px) ──────────────────────────
export function TenantStatusDonutChart({
  active = 0,
  trial = 0,
  suspended = 0,
}) {
  const total = active + trial + suspended;

  const data = [
    { label: "Active Stores", count: active, color: "#10B981" },
    { label: "Trial Accounts", count: trial, color: "#3B82F6" },
    { label: "Suspended", count: suspended, color: "#F43F5E" },
  ];

  const radius = 65;
  const circumference = 2 * Math.PI * radius;

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
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="transparent"
            stroke="#F1F5F9"
            strokeWidth="20"
          />

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

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-3xl font-bold tracking-tight text-slate-900 font-sans">
            {total}
          </span>
          <span className="text-[11px] text-slate-400 font-medium mt-0.5">
            Total Tenants
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

// ── 2. SVG DUAL-AXIS MRR & PLATFORM ORDERS CHART ─────────────────
export function AdminMrrDualAxisChart({
  chartData = [
    { period: "May", mrr: 84000, orders: 320 },
    { period: "Jun", mrr: 102000, orders: 480 },
    { period: "Jul", mrr: 119000, orders: 610 },
    { period: "Aug", mrr: 135000, orders: 740 },
    { period: "Sep", mrr: 158000, orders: 920 },
    { period: "Oct", mrr: 182000, orders: 1150 },
  ],
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const points = chartData;
  const maxMrr = Math.max(...points.map((p) => p.mrr), 50000);
  const maxOrders = Math.max(...points.map((p) => p.orders), 100);

  const width = 500;
  const height = 180;
  const padLeft = 52;
  const padRight = 35;
  const padBottom = 25;
  const padTop = 15;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;
  const stepX = chartW / (points.length - 1 || 1);

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
        {/* Horizontal Dashed Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padTop + chartH * (1 - ratio);
          const mrrVal = Math.round(maxMrr * ratio);
          const ordVal = Math.round(maxOrders * ratio);

          return (
            <g key={ratio}>
              {/* Left Y-Axis (MRR ৳) */}
              <text
                x={padLeft - 8}
                y={y + 3}
                textAnchor="end"
                className="text-[10px] font-mono fill-slate-400"
              >
                {mrrVal >= 1000 ? `৳${(mrrVal / 1000).toFixed(0)}k` : `৳${mrrVal}`}
              </text>

              {/* Dashed Line */}
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="#E2E8F0"
                strokeDasharray="3 3"
                strokeWidth="1"
              />

              {/* Right Y-Axis (Orders) */}
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

        {/* MRR Bars */}
        {points.map((p, i) => {
          const x = padLeft + i * stepX - 11;
          const barH = (p.mrr / maxMrr) * chartH;
          const y = padTop + chartH - barH;
          const isHovered = hoveredIndex === i;

          return (
            <g
              key={i}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <rect
                x={x}
                y={y}
                width="22"
                height={Math.max(barH, 3)}
                rx="3"
                ry="3"
                fill={isHovered ? "#EA580C" : "#FDBA74"}
                className="transition-colors duration-150"
              />

              <text
                x={padLeft + i * stepX}
                y={height - 6}
                textAnchor="middle"
                className={`text-[10px] font-mono ${
                  isHovered ? "fill-slate-900 font-bold" : "fill-slate-400"
                }`}
              >
                {p.period}
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
          <div className="font-semibold text-slate-200">{points[hoveredIndex].period}</div>
          <div className="text-orange-400 font-medium">
            MRR: ৳{points[hoveredIndex].mrr.toLocaleString()}
          </div>
          <div className="text-slate-300">
            Orders: {points[hoveredIndex].orders.toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 3. PLAN DISTRIBUTION LIST ────────────────────────────────────
export function PlanDistributionList({ plans = [] }) {
  const defaultPlans = [
    { name: "Starter Tier (Free Quota)", color: "#94A3B8", count: 0, pct: 0 },
    { name: "Growth Pro (৳4,999/mo)", color: "#EA580C", count: 0, pct: 0 },
    { name: "Scale & Enterprise", color: "#3B82F6", count: 0, pct: 0 },
  ];

  const list = defaultPlans.map((item) => {
    const match = plans.find((p) => p.name.toLowerCase().includes(item.name.toLowerCase().split(" ")[0]));
    return match ? { ...item, count: match.count, pct: match.pct } : item;
  });

  return (
    <div className="space-y-4">
      {list.map((plan) => (
        <div key={plan.name} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: plan.color }}
              />
              <span className="font-medium text-slate-700">{plan.name}</span>
            </div>
            <div className="font-mono text-slate-500 text-[11px]">
              <span className="font-semibold text-slate-900">{plan.count}</span> ({(Number(plan.pct) || 0).toFixed(0)}%)
            </div>
          </div>

          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.max(Number(plan.pct) || 0, 0)}%`,
                backgroundColor: plan.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
