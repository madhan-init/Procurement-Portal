/** Chevron for appearance-none selects. Positioned by the caller's relative box. */
export default function Chevron() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280]"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
