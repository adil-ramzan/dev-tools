import type { ReactNode } from "react";
import type { ToolIconName } from "@/types/tool";

/*
 * Colorful, emoji-style tool icons drawn as SVG on a 32×32 grid, so they look
 * the same on every device (real emoji vary by platform). Colors are fixed
 * and chosen to read on both the light and dark themes.
 */

const text = (x: number, y: number, size: number, fill: string, value: string) => (
  <text x={x} y={y} fontSize={size} fontWeight={800} fill={fill} textAnchor="middle" fontFamily="ui-sans-serif, system-ui, sans-serif">
    {value}
  </text>
);

const icons: Record<ToolIconName, ReactNode> = {
  braces: (
    <>
      <path d="M8 3h11l7 7v17a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" fill="#FCD34D" />
      <path d="M19 3v5a2 2 0 0 0 2 2h5Z" fill="#F59E0B" />
      <path d="M13 13.5c-1.6 0-2 .7-2 2v1.3c0 .8-.5 1.2-1.4 1.2.9 0 1.4.4 1.4 1.2v1.3c0 1.3.4 2 2 2M19 13.5c1.6 0 2 .7 2 2v1.3c0 .8.5 1.2 1.4 1.2-.9 0-1.4.4-1.4 1.2v1.3c0 1.3-.4 2-2 2" fill="none" stroke="#92400E" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  "text-lines": (
    <>
      <rect x="5" y="3" width="20" height="26" rx="2.5" fill="#F8FAFC" stroke="#CBD5E1" />
      <path d="M9 9h12M9 13h12M9 17h8M9 21h6" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
      <circle cx="23.5" cy="23.5" r="6" fill="#EF4444" />
      {text(23.5, 26.5, 8, "#fff", "#")}
    </>
  ),
  link: (
    <>
      <path d="M14.5 17.5a5 5 0 0 0 7.1 0l4-4a5 5 0 0 0-7.1-7.1l-1.6 1.6" fill="none" stroke="#14B8A6" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M17.5 14.5a5 5 0 0 0-7.1 0l-4 4a5 5 0 0 0 7.1 7.1l1.6-1.6" fill="none" stroke="#38BDF8" strokeWidth="3.4" strokeLinecap="round" />
    </>
  ),
  compress: (
    <>
      <rect x="3" y="3" width="26" height="26" rx="6" fill="#8B5CF6" />
      <path d="M7 16h7M11 12.5l3.5 3.5-3.5 3.5M25 16h-7M21 12.5 17.5 16l3.5 3.5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  binary: (
    <>
      <rect x="3" y="3" width="26" height="26" rx="6" fill="#22C55E" />
      <rect x="7.5" y="8" width="7" height="16" rx="3.5" fill="none" stroke="#fff" strokeWidth="2.2" />
      <path d="M19 11l3-3v16" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  dice: (
    <>
      <rect x="4" y="4" width="24" height="24" rx="6" fill="#EF4444" />
      <rect x="4" y="4" width="24" height="24" rx="6" fill="none" stroke="#B91C1C" />
      <g fill="#fff">
        <circle cx="10.5" cy="10.5" r="2.2" />
        <circle cx="21.5" cy="10.5" r="2.2" />
        <circle cx="16" cy="16" r="2.2" />
        <circle cx="10.5" cy="21.5" r="2.2" />
        <circle cx="21.5" cy="21.5" r="2.2" />
      </g>
    </>
  ),
  case: (
    <>
      <rect x="3" y="3" width="26" height="26" rx="6" fill="#3B82F6" />
      {text(16, 21.5, 14, "#fff", "Aa")}
    </>
  ),
  regex: (
    <>
      <rect x="3" y="3" width="26" height="26" rx="6" fill="#6366F1" />
      <circle cx="10" cy="21.5" r="2.3" fill="#FDE68A" />
      <path d="M20 8v10M15.7 10.5l8.6 5M24.3 10.5l-8.6 5" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" />
    </>
  ),
  key: (
    <>
      <circle cx="11" cy="21" r="7" fill="#FBBF24" stroke="#B45309" strokeWidth="1.2" />
      <circle cx="9.5" cy="22.5" r="2.2" fill="#B45309" />
      <path d="M15.5 16.5 26 6m-4.5 4.5 3 3m-6-0.5 2.5 2.5" fill="none" stroke="#F59E0B" strokeWidth="3.2" strokeLinecap="round" />
    </>
  ),
  clock: (
    <>
      <circle cx="16" cy="16" r="13" fill="#F97316" />
      <circle cx="16" cy="16" r="10" fill="#FFF7ED" />
      <path d="M16 9.5V16l4.5 2.5" fill="none" stroke="#1F2937" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="1.4" fill="#1F2937" />
    </>
  ),
  diff: (
    <>
      <rect x="3" y="5" width="15" height="20" rx="2.5" fill="#FECACA" stroke="#F87171" />
      <rect x="14" y="8" width="15" height="20" rx="2.5" fill="#BBF7D0" stroke="#4ADE80" />
      <path d="M7 15h7" stroke="#DC2626" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M17.5 18h8M21.5 14v8" stroke="#16A34A" strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  database: (
    <>
      <path d="M5 8v16c0 2.5 4.9 4.5 11 4.5s11-2 11-4.5V8" fill="#0284C7" />
      <path d="M5 16c0 2.5 4.9 4.5 11 4.5s11-2 11-4.5" fill="none" stroke="#7DD3FC" strokeWidth="1.5" />
      <path d="M5 22c0 2.5 4.9 4.5 11 4.5s11-2 11-4.5" fill="none" stroke="#7DD3FC" strokeWidth="1.5" opacity=".6" />
      <ellipse cx="16" cy="8" rx="11" ry="4.5" fill="#38BDF8" />
    </>
  ),
  type: (
    <>
      <rect x="3" y="3" width="26" height="26" rx="5" fill="#3178C6" />
      {text(19.5, 25, 11, "#fff", "TS")}
    </>
  ),
  table: (
    <>
      <rect x="3" y="5" width="26" height="22" rx="3.5" fill="#16A34A" />
      <rect x="3" y="5" width="26" height="6" rx="3" fill="#15803D" />
      <path d="M3.5 17h25M3.5 22h25M12 11v16M21 11v16" stroke="#BBF7D0" strokeWidth="1.4" />
    </>
  ),
  "check-file": (
    <>
      <path d="M8 3h11l7 7v17a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" fill="#F1F5F9" stroke="#94A3B8" />
      <path d="M19 3v5a2 2 0 0 0 2 2h5" fill="#E2E8F0" stroke="#94A3B8" />
      <circle cx="16" cy="19" r="6.5" fill="#22C55E" />
      <path d="m13 19 2.2 2.2 4-4.2" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  "angle-brackets": (
    <>
      <rect x="3" y="3" width="26" height="26" rx="6" fill="#F97316" />
      <path d="M11 10.5 6.5 16l4.5 5.5M21 10.5l4.5 5.5-4.5 5.5M18 9l-4 14" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  compare: (
    <>
      <rect x="3" y="3" width="26" height="26" rx="6" fill="#0F172A" />
      <path d="M8 12h14l-3.5-3.5" fill="none" stroke="#A78BFA" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 20H10l3.5 3.5" fill="none" stroke="#2DD4BF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  palette: (
    <>
      <path d="M16 3.5C8.8 3.5 3 8.9 3 15.6 3 22.4 8.8 28.5 15 28.5c1.9 0 2.6-1.4 2-2.9-.7-1.7.4-3.1 2.2-3.1h2.6c3.4 0 7.2-2.6 7.2-7.4C29 8.6 23.2 3.5 16 3.5Z" fill="#FDE68A" stroke="#D97706" strokeWidth="1.2" />
      <circle cx="9.5" cy="15" r="2.4" fill="#EF4444" />
      <circle cx="12.5" cy="9" r="2.4" fill="#3B82F6" />
      <circle cx="19.5" cy="8.5" r="2.4" fill="#22C55E" />
      <circle cx="24" cy="13.5" r="2.4" fill="#A855F7" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="6" width="24" height="22" rx="3.5" fill="#fff" stroke="#CBD5E1" />
      <path d="M4 9.5A3.5 3.5 0 0 1 7.5 6h17A3.5 3.5 0 0 1 28 9.5V12H4Z" fill="#EF4444" />
      <path d="M10 3.5v5M22 3.5v5" stroke="#475569" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="16" cy="20" r="5" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.5" />
      <path d="M16 17.5V20l1.8 1.2" fill="none" stroke="#1D4ED8" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  markdown: (
    <>
      <rect x="2" y="6" width="28" height="20" rx="4" fill="#334155" />
      <path d="M6.5 21.5v-11l4 5 4-5v11" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22.5 10.5v10M19 17.5l3.5 3.5 3.5-3.5" fill="none" stroke="#38BDF8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  gradient: (
    <>
      <rect x="3" y="3" width="26" height="26" rx="6" fill="#EC4899" />
      <path d="M11 3h6v26h-6z" fill="#D946EF" />
      <path d="M17 3h6v26h-6z" fill="#8B5CF6" />
      <path d="M23 3h.01A6 6 0 0 1 29 9v14a6 6 0 0 1-6 6Z" fill="#6366F1" />
      <rect x="3" y="3" width="26" height="26" rx="6" fill="none" stroke="#fff" strokeOpacity=".35" />
    </>
  ),
  shadow: (
    <>
      <rect x="9" y="9" width="19" height="19" rx="4" fill="#94A3B8" opacity=".55" />
      <rect x="6.5" y="6.5" width="19" height="19" rx="4" fill="#64748B" opacity=".45" />
      <rect x="4" y="4" width="19" height="19" rx="4" fill="#fff" stroke="#3B82F6" strokeWidth="1.8" />
    </>
  ),
  ruler: (
    <>
      <rect x="2" y="9" width="28" height="14" rx="2.5" fill="#FACC15" stroke="#CA8A04" />
      <path d="M7 9v5M12 9v7M17 9v5M22 9v7M27 9v5" stroke="#713F12" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  columns: (
    <>
      <rect x="2.5" y="5" width="27" height="22" rx="4" fill="#E0F2FE" stroke="#7DD3FC" />
      <rect x="6" y="9" width="5.5" height="14" rx="1.5" fill="#F472B6" />
      <rect x="13.25" y="9" width="5.5" height="10" rx="1.5" fill="#FBBF24" />
      <rect x="20.5" y="9" width="5.5" height="12" rx="1.5" fill="#22D3EE" />
    </>
  ),
  token: (
    <>
      <rect x="2.5" y="7" width="27" height="18" rx="5" fill="#0F766E" />
      <rect x="2.5" y="7" width="27" height="18" rx="5" fill="none" stroke="#14B8A6" />
      <g stroke="#CCFBF1" strokeWidth="2" strokeLinecap="round">
        <path d="M9 13v6M6.4 14.5l5.2 3M11.6 14.5l-5.2 3" />
        <path d="M16 13v6M13.4 14.5l5.2 3M18.6 14.5l-5.2 3" />
        <path d="M23 13v6M20.4 14.5l5.2 3M25.6 14.5l-5.2 3" />
      </g>
    </>
  ),
  hash: (
    <>
      <rect x="3" y="3" width="26" height="26" rx="6" fill="#7C3AED" />
      <path d="M13 8.5 11 23.5M21 8.5l-2 15M8.5 13h16M7.5 19h16" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" />
      <circle cx="24.5" cy="24.5" r="4" fill="#FDE047" stroke="#7C3AED" strokeWidth="1.2" />
    </>
  ),
  "date-convert": (
    <>
      <rect x="3" y="5" width="20" height="19" rx="3" fill="#fff" stroke="#CBD5E1" />
      <path d="M3 8a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v2.5H3Z" fill="#0EA5E9" />
      {text(13, 20.5, 8, "#0F172A", "15")}
      <circle cx="23" cy="23" r="7" fill="#10B981" />
      <path d="M19.8 21.5h6l-1.8-1.8M26.2 24.5h-6l1.8 1.8" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  "number-base": (
    <>
      <rect x="2.5" y="4" width="27" height="24" rx="5" fill="#1E293B" />
      {text(10, 14.5, 7.5, "#FBBF24", "0x")}
      {text(22, 14.5, 7.5, "#34D399", "10")}
      {text(16, 24.5, 7.5, "#60A5FA", "0b1")}
      <path d="M16 6.5v9.5" stroke="#475569" strokeWidth="1" />
    </>
  ),
  "file-binary": (
    <>
      <path d="M8 3h11l7 7v17a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" fill="#DCFCE7" stroke="#22C55E" />
      <path d="M19 3v5a2 2 0 0 0 2 2h5" fill="#BBF7D0" stroke="#22C55E" />
      <rect x="9" y="14" width="14" height="10" rx="2" fill="#15803D" />
      {text(16, 21.5, 6.5, "#fff", "B64")}
    </>
  ),
  ampersand: (
    <>
      <rect x="3" y="3" width="26" height="26" rx="6" fill="#E11D48" />
      {text(16, 23, 17, "#fff", "&")}
    </>
  ),
  bits: (
    <>
      <rect x="3" y="3" width="26" height="26" rx="6" fill="#0F172A" />
      <g fontFamily="ui-monospace, monospace" fontSize="7" fontWeight={700} textAnchor="middle">
        <text x="16" y="12" fill="#4ADE80">0110</text>
        <text x="16" y="19" fill="#22D3EE">1001</text>
        <text x="16" y="26" fill="#4ADE80">0101</text>
      </g>
    </>
  ),
  layers: (
    <>
      <path d="M16 4 29 10.5 16 17 3 10.5Z" fill="#F59E0B" />
      <path d="m5.5 15.2-2.5 1.3L16 23l13-6.5-2.5-1.3L16 20.5Z" fill="#3B82F6" />
      <path d="m5.5 20.7-2.5 1.3L16 28.5 29 22l-2.5-1.3L16 26Z" fill="#8B5CF6" />
    </>
  ),
  list: (
    <>
      <rect x="4" y="3" width="24" height="26" rx="3" fill="#F8FAFC" stroke="#CBD5E1" />
      <circle cx="9.5" cy="10" r="1.8" fill="#F43F5E" />
      <circle cx="9.5" cy="16" r="1.8" fill="#F59E0B" />
      <circle cx="9.5" cy="22" r="1.8" fill="#10B981" />
      <path d="M13.5 10h10M13.5 16h8M13.5 22h6" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  "file-type": (
    <>
      <path d="M8 3h11l7 7v17a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" fill="#E0E7FF" stroke="#6366F1" />
      <path d="M19 3v5a2 2 0 0 0 2 2h5" fill="#C7D2FE" stroke="#6366F1" />
      <rect x="4" y="15" width="20" height="9" rx="2" fill="#4F46E5" />
      {text(14, 21.8, 6, "#fff", "MIME")}
    </>
  ),
  slug: (
    <>
      <rect x="2.5" y="9" width="27" height="14" rx="7" fill="#0EA5E9" />
      <path d="M8 16h3.5M14.25 16h3.5M20.5 16H24" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <path d="m12 13.5-1.5 5M18.25 13.5l-1.5 5" stroke="#BAE6FD" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  mask: (
    <>
      <rect x="2.5" y="8" width="27" height="16" rx="4" fill="#1F2937" />
      {text(8, 19.5, 8, "#FDE68A", "ab")}
      <g fill="#9CA3AF">
        <circle cx="14" cy="16" r="1.5" />
        <circle cx="18" cy="16" r="1.5" />
        <circle cx="22" cy="16" r="1.5" />
      </g>
      {text(26.3, 19.5, 8, "#FDE68A", "z")}
    </>
  ),
  ulid: (
    <>
      <rect x="3" y="3" width="26" height="26" rx="6" fill="#0D9488" />
      <path d="M8 23V18M12 23v-7M16 23v-9M20 23v-11M24 23V9" stroke="#CCFBF1" strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  bcrypt: (
    <>
      <path d="M10 13V9.5a6 6 0 0 1 12 0V13" fill="none" stroke="#64748B" strokeWidth="2.6" />
      <rect x="5" y="13" width="22" height="16" rx="3.5" fill="#F59E0B" />
      {text(16, 24.5, 8, "#78350F", "$2b")}
    </>
  ),
  hmac: (
    <>
      <path d="M8 3h11l7 7v17a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" fill="#F8FAFC" stroke="#94A3B8" />
      <path d="M10 10h7M10 14h11M10 18h6" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="21.5" cy="22.5" r="6.5" fill="#DC2626" />
      <path d="m18.8 22.6 1.9 1.9 3.6-3.8" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  "key-pair": (
    <>
      <circle cx="10" cy="11" r="5.5" fill="#10B981" />
      <circle cx="10" cy="11" r="1.8" fill="#ECFDF5" />
      <path d="M14 14.5 22 22.5M19 19.5l2-2M21.5 22l2-2" stroke="#10B981" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="22" cy="10" r="5.5" fill="#6366F1" />
      <circle cx="22" cy="10" r="1.8" fill="#EEF2FF" />
      <path d="M18 13.5 10 21.5M13 18.5l-2-2M10.5 21l-2-2" stroke="#6366F1" strokeWidth="2.6" strokeLinecap="round" />
    </>
  ),
  strength: (
    <>
      <path d="M4 22a12 12 0 0 1 24 0" fill="none" stroke="#E2E8F0" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M4 22a12 12 0 0 1 5.2-9.9" fill="none" stroke="#EF4444" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M11.5 11a12 12 0 0 1 9 0" fill="none" stroke="#F59E0B" strokeWidth="4.5" />
      <path d="M22.8 12.1A12 12 0 0 1 28 22" fill="none" stroke="#22C55E" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M16 22 21.5 14" stroke="#1E293B" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="16" cy="22" r="2.6" fill="#1E293B" />
    </>
  ),
  encrypt: (
    <>
      <rect x="2.5" y="5" width="19" height="15" rx="2.5" fill="#F8FAFC" stroke="#94A3B8" />
      <path d="M6 10h12M6 14h8" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18 18v-2.5a4 4 0 0 1 8 0V18" fill="none" stroke="#475569" strokeWidth="2.2" />
      <rect x="15" y="18" width="14" height="11" rx="2.5" fill="#2563EB" />
      <circle cx="22" cy="23.5" r="1.8" fill="#DBEAFE" />
    </>
  ),
  otp: (
    <>
      <rect x="7" y="2.5" width="18" height="27" rx="3.5" fill="#1E293B" />
      <rect x="9.5" y="7" width="13" height="16" rx="1.5" fill="#ECFEFF" />
      {text(16, 17.5, 6.5, "#0E7490", "428")}
      <path d="M10.5 20.5h11" stroke="#06B6D4" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16" cy="26" r="1.2" fill="#64748B" />
    </>
  ),
  "basic-auth": (
    <>
      <rect x="2.5" y="6" width="27" height="20" rx="3" fill="#FEF3C7" stroke="#D97706" />
      <circle cx="10" cy="14" r="3.2" fill="#D97706" />
      <path d="M5.5 22a4.5 4.5 0 0 1 9 0Z" fill="#D97706" />
      <path d="M17.5 12h8M17.5 16h6M17.5 20h7" stroke="#92400E" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  curl: (
    <>
      <rect x="2.5" y="4" width="27" height="24" rx="4" fill="#0F172A" />
      <path d="M7 11.5 11 14l-4 2.5" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 17h6" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" />
      <path d="M17 23h9l-2.5-2.5M26 23l-2.5 2.5" fill="none" stroke="#FBBF24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  "url-parse": (
    <>
      <rect x="2" y="9" width="28" height="14" rx="7" fill="#E0F2FE" stroke="#0284C7" />
      <rect x="5" y="12.5" width="7" height="7" rx="2" fill="#0284C7" />
      <rect x="13.5" y="12.5" width="6" height="7" rx="2" fill="#F59E0B" />
      <rect x="21" y="12.5" width="6" height="7" rx="2" fill="#10B981" />
    </>
  ),
  wysiwyg: (
    <>
      <rect x="2.5" y="3.5" width="27" height="25" rx="3.5" fill="#fff" stroke="#94A3B8" />
      <path d="M2.5 7a3.5 3.5 0 0 1 3.5-3.5h20A3.5 3.5 0 0 1 29.5 7v3h-27Z" fill="#E2E8F0" />
      {text(7.5, 9.2, 5.5, "#1E293B", "B")}
      {text(12.5, 9.2, 5.5, "#1E293B", "I")}
      <path d="M6 15h16M6 19h20M6 23h12" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  "user-agent": (
    <>
      <rect x="2.5" y="5" width="27" height="19" rx="2.5" fill="#1E293B" />
      <rect x="4.5" y="7" width="23" height="15" rx="1" fill="#DBEAFE" />
      <path d="M11 28h10M16 24v4" stroke="#475569" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="16" cy="13" r="2.8" fill="#2563EB" />
      <path d="M11 20a5 5 0 0 1 10 0Z" fill="#2563EB" />
    </>
  ),
  "http-status": (
    <>
      <rect x="2.5" y="6" width="27" height="20" rx="4" fill="#FEE2E2" stroke="#EF4444" />
      {text(16, 20.5, 11, "#B91C1C", "404")}
    </>
  ),
  keyboard: (
    <>
      <rect x="2" y="8" width="28" height="17" rx="3" fill="#334155" />
      <g fill="#E2E8F0">
        <rect x="5" y="11" width="3.5" height="3" rx=".6" />
        <rect x="10" y="11" width="3.5" height="3" rx=".6" />
        <rect x="15" y="11" width="3.5" height="3" rx=".6" />
        <rect x="20" y="11" width="3.5" height="3" rx=".6" />
        <rect x="5" y="16" width="3.5" height="3" rx=".6" />
        <rect x="20" y="16" width="7" height="3" rx=".6" />
        <rect x="9" y="20.5" width="14" height="2.5" rx=".6" />
      </g>
      <rect x="10" y="16" width="8.5" height="3" rx=".6" fill="#FBBF24" />
    </>
  ),
  qr: (
    <>
      <rect x="3" y="3" width="26" height="26" rx="3" fill="#fff" stroke="#CBD5E1" />
      <g fill="#0F172A">
        <path d="M6 6h7v7H6Zm2 2v3h3V8ZM19 6h7v7h-7Zm2 2v3h3V8ZM6 19h7v7H6Zm2 2v3h3v-3Z" fillRule="evenodd" />
        <rect x="15" y="6" width="2" height="2" />
        <rect x="15" y="10" width="2" height="4" />
        <rect x="19" y="15" width="3" height="2" />
        <rect x="15" y="17" width="2" height="2" />
        <rect x="23" y="18" width="3" height="3" />
        <rect x="18" y="21" width="3" height="5" />
        <rect x="22" y="24" width="4" height="2" />
      </g>
      <rect x="15" y="15" width="2" height="2" fill="#6366F1" />
    </>
  ),
  placeholder: (
    <>
      <rect x="2.5" y="5" width="27" height="22" rx="3" fill="#E2E8F0" stroke="#94A3B8" strokeDasharray="3 2" />
      <path d="M2.5 5 29.5 27M29.5 5 2.5 27" stroke="#CBD5E1" strokeWidth="1.2" />
      <rect x="9" y="12.5" width="14" height="7" rx="1.5" fill="#64748B" />
      {text(16, 18.2, 5, "#fff", "SVG")}
    </>
  ),
  git: (
    <>
      <rect x="3" y="3" width="26" height="26" rx="6" fill="#1E293B" />
      <path d="M11 8v16" stroke="#94A3B8" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M11 12c0 4 10 2 10 7" fill="none" stroke="#F97316" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="11" cy="8" r="2.4" fill="#E2E8F0" />
      <circle cx="11" cy="24" r="2.4" fill="#E2E8F0" />
      <circle cx="21" cy="20" r="2.4" fill="#F97316" />
    </>
  ),
  docker: (
    <>
      <rect x="4" y="16" width="11" height="9" rx="1" fill="#2563EB" />
      <rect x="17" y="16" width="11" height="9" rx="1" fill="#0EA5E9" />
      <rect x="10.5" y="6" width="11" height="9" rx="1" fill="#14B8A6" />
      <path d="M7 18v5M9.5 18v5M12 18v5M20 18v5M22.5 18v5M25 18v5M13.5 8v5M16 8v5M18.5 8v5" stroke="#fff" strokeOpacity=".55" strokeWidth="1" />
      <path d="M3 27h26" stroke="#475569" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  benchmark: (
    <>
      <circle cx="16" cy="17.5" r="11" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.5" />
      <path d="M13.5 3.5h5M16 3.5v3" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 17.5 21.5 11" stroke="#B45309" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="16" cy="17.5" r="2" fill="#B45309" />
      <path d="M8.5 21h2M21.5 21h2M16 9.5v1.5" stroke="#D97706" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  lorem: (
    <>
      <rect x="4" y="3" width="24" height="26" rx="3" fill="#FFFBEB" stroke="#F59E0B" />
      {text(10.5, 13, 9, "#B45309", "L")}
      <path d="M15 8h9M15 12h9M8 17h16M8 21h16M8 25h10" stroke="#D97706" strokeWidth="1.6" strokeLinecap="round" opacity=".7" />
    </>
  ),
  chmod: (
    <>
      <rect x="2.5" y="6" width="27" height="20" rx="3.5" fill="#1E293B" />
      <g fontFamily="ui-monospace, monospace" fontSize="7" fontWeight={700} textAnchor="middle">
        <text x="9" y="14.5" fill="#4ADE80">rwx</text>
        <text x="16" y="14.5" fill="#FBBF24">r-x</text>
        <text x="23" y="14.5" fill="#F87171">r--</text>
      </g>
      {text(16, 23.5, 7, "#E2E8F0", "754")}
    </>
  ),
  subnet: (
    <>
      <rect x="11" y="3" width="10" height="7" rx="1.5" fill="#0EA5E9" />
      <path d="M16 10v4M7 14h18M7 14v4M16 14v4M25 14v4" fill="none" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="3" y="18" width="8" height="7" rx="1.5" fill="#22C55E" />
      <rect x="12" y="18" width="8" height="7" rx="1.5" fill="#22C55E" />
      <rect x="21" y="18" width="8" height="7" rx="1.5" fill="#22C55E" />
    </>
  ),
  "ip-convert": (
    <>
      <rect x="2.5" y="4" width="27" height="24" rx="4" fill="#EEF2FF" stroke="#6366F1" />
      {text(16, 13, 6.5, "#4338CA", "10.0.0.1")}
      <path d="M12 16.5h8l-2-2M20 16.5l-2 2" fill="none" stroke="#6366F1" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      {text(16, 25, 6, "#0F172A", "0x0A..")}
    </>
  ),
  "ip-range": (
    <>
      <rect x="3" y="4" width="26" height="24" rx="3" fill="#F8FAFC" stroke="#94A3B8" />
      <g fill="#0284C7">
        <rect x="6.5" y="8" width="3" height="3" rx=".6" />
        <rect x="6.5" y="14.5" width="3" height="3" rx=".6" />
        <rect x="6.5" y="21" width="3" height="3" rx=".6" />
      </g>
      <path d="M12 9.5h13M12 16h11M12 22.5h9" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  mac: (
    <>
      <rect x="4" y="9" width="24" height="14" rx="2" fill="#334155" />
      <path d="M9 23v4M14 23v4M18 23v4M23 23v4" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" />
      {text(16, 18.5, 6, "#FDE68A", "00:1A:2B")}
    </>
  ),
  ipv6: (
    <>
      <rect x="2.5" y="5" width="27" height="22" rx="4" fill="#7C3AED" />
      {text(16, 15, 7, "#fff", "fd00::")}
      {text(16, 23, 6, "#DDD6FE", "/48")}
    </>
  ),
  device: (
    <>
      <rect x="2.5" y="5" width="20" height="14" rx="2" fill="#E2E8F0" stroke="#64748B" />
      <path d="M8 23h9M12.5 19v4" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="20" y="11" width="9.5" height="17" rx="2" fill="#0EA5E9" />
      <rect x="21.8" y="13.5" width="6" height="11" rx=".8" fill="#E0F2FE" />
    </>
  ),
  port: (
    <>
      <rect x="4" y="6" width="24" height="20" rx="3" fill="#0F766E" />
      <rect x="9" y="11" width="14" height="8" rx="1" fill="#134E4A" />
      <path d="M11 11v3M14 11v3M17 11v3M20 11v3" stroke="#5EEAD4" strokeWidth="1.4" />
      {text(16, 24.5, 5, "#CCFBF1", "8080")}
    </>
  ),
};

export function ToolIcon({ name, size = 28 }: { name: ToolIconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false" className="shrink-0">
      {icons[name]}
    </svg>
  );
}
