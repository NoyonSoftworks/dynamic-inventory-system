"use client";

import { useState } from "react";

// Bangladesh 8 Administrative Divisions Geo Data & SVG Paths
// Coordinated in a 360x440 viewBox
export const BD_DIVISIONS = [
  {
    id: "rangpur",
    name: "Rangpur",
    code: "07",
    center: { x: 110, y: 80 },
    path: "M 90 35 L 145 40 L 165 75 L 150 120 L 120 135 L 75 115 L 65 70 Z",
    orders: 0,
    pct: 0,
  },
  {
    id: "rajshahi",
    name: "Rajshahi",
    code: "04",
    center: { x: 95, y: 175 },
    path: "M 75 118 L 120 138 L 148 145 L 140 205 L 115 225 L 55 205 L 50 150 Z",
    orders: 0,
    pct: 0,
  },
  {
    id: "mymensingh",
    name: "Mymensingh",
    code: "08",
    center: { x: 195, y: 135 },
    path: "M 152 122 L 235 115 L 240 160 L 205 180 L 155 175 L 150 140 Z",
    orders: 0,
    pct: 0,
  },
  {
    id: "sylhet",
    name: "Sylhet",
    code: "03",
    center: { x: 280, y: 140 },
    path: "M 238 115 L 320 110 L 335 155 L 305 190 L 245 185 L 238 150 Z",
    orders: 0,
    pct: 0,
  },
  {
    id: "dhaka",
    name: "Dhaka",
    code: "01",
    center: { x: 190, y: 230 },
    path: "M 145 180 L 205 182 L 242 188 L 245 255 L 210 280 L 155 270 L 142 210 Z",
    orders: 0,
    pct: 0,
  },
  {
    id: "khulna",
    name: "Khulna",
    code: "05",
    center: { x: 120, y: 295 },
    path: "M 115 228 L 155 235 L 165 295 L 155 370 L 85 365 L 80 270 Z",
    orders: 0,
    pct: 0,
  },
  {
    id: "barisal",
    name: "Barisal",
    code: "06",
    center: { x: 200, y: 325 },
    path: "M 168 285 L 215 282 L 235 320 L 225 385 L 165 375 L 165 315 Z",
    orders: 0,
    pct: 0,
  },
  {
    id: "chittagong",
    name: "Chittagong",
    code: "02",
    center: { x: 285, y: 290 },
    path: "M 248 190 L 285 200 L 325 240 L 340 330 L 320 425 L 285 410 L 255 330 L 245 260 Z",
    orders: 0,
    pct: 0,
  },
];

export default function BangladeshDivisionMap({
  divisionStats = [],
  hoveredDivision = null,
  onHoverDivision = () => {},
}) {
  const [activeTooltip, setActiveTooltip] = useState(null);

  // Merge dynamic division stats
  const divisions = BD_DIVISIONS.map((d) => {
    const match = divisionStats.find(
      (s) => s.id === d.id || s.name.toLowerCase() === d.name.toLowerCase()
    );
    return {
      ...d,
      orders: match ? match.orders : d.orders,
      pct: match ? match.pct : d.pct,
    };
  });

  return (
    <div className="relative w-full flex items-center justify-center select-none py-2">
      <svg
        viewBox="0 0 380 450"
        className="w-full max-w-[280px] sm:max-w-[320px] h-auto drop-shadow-xs"
      >
        <defs>
          <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#3B82F6" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Division Polygon Paths */}
        {divisions.map((div) => {
          const isHovered = hoveredDivision === div.id;

          return (
            <g
              key={div.id}
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => {
                onHoverDivision(div.id);
                setActiveTooltip(div);
              }}
              onMouseLeave={() => {
                onHoverDivision(null);
                setActiveTooltip(null);
              }}
            >
              <path
                d={div.path}
                fill={isHovered ? "#93C5FD" : "#E2E8F0"}
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                filter={isHovered ? "url(#soft-glow)" : undefined}
                className="transition-colors duration-150"
              />

              {/* Centroid Location Dot */}
              <circle
                cx={div.center.x}
                cy={div.center.y}
                r={isHovered ? 5.5 : 4}
                fill={isHovered ? "#2563EB" : "#94A3B8"}
                stroke="#FFFFFF"
                strokeWidth="2"
                className="transition-all duration-150"
              />

              {/* Division Label */}
              <text
                x={div.center.x}
                y={div.center.y - 8}
                textAnchor="middle"
                className={`text-[10px] font-mono select-none pointer-events-none transition-colors ${
                  isHovered ? "fill-blue-700 font-bold" : "fill-slate-600 font-medium"
                }`}
              >
                {div.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating Hover Card */}
      {activeTooltip && (
        <div className="absolute top-2 left-2 z-10 bg-slate-900 text-white text-xs rounded-lg px-2.5 py-1.5 shadow-md pointer-events-none animate-in fade-in duration-150">
          <div className="font-semibold">{activeTooltip.name} Division</div>
          <div className="text-[11px] text-slate-300 font-mono">
            {activeTooltip.orders} orders ({activeTooltip.pct}%)
          </div>
        </div>
      )}
    </div>
  );
}
