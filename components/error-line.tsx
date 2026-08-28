/** Centred error line. Holds 26px of space always so the form below it
 *  doesn't jump when a message arrives. */
export default function ErrorLine({ message }: { message: string }) {
  return (
    <div aria-live="polite" className="min-h-[26px]">
      {message && (
        <p
          id="screen-error"
          className="mt-3 flex items-center justify-center gap-1.5 text-center text-[16px] text-[#E5484D]"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
            <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.7" />
            <path d="M12 7.75v.5M12 11v5.25" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          {message}
        </p>
      )}
    </div>
  );
}
