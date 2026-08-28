// The signature "parchi" — an amber paper token slip with a dashed tear-line.
// Reused on Home, the tracker, and the booking-success screen.
export default function TokenSlip({
  heading,
  token,
  line1,
  line2,
  footer,
  size = "md",
  notch = "bg-page",
}: {
  heading: string;
  token: number;
  line1: string;
  line2?: string;
  footer?: React.ReactNode;
  size?: "md" | "lg";
  notch?: string; // must match the surface behind the slip
}) {
  return (
    <div className="relative rounded-xl border border-wheat-600/25 bg-wheat-50 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-wheat-600">{heading}</p>
      <p className={`font-black leading-none text-wheat-900 ${size === "lg" ? "mt-2 text-7xl" : "mt-1.5 text-5xl"}`}>
        #{token}
      </p>
      <p className="mt-2 text-sm font-medium text-wheat-700">{line1}</p>
      {line2 && <p className="text-sm text-wheat-600">{line2}</p>}
      {footer && (
        <>
          <div className="relative my-3.5">
            <div className="border-t-2 border-dashed border-wheat-600/30" />
            <span className={`absolute -left-[26px] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full ${notch}`} />
            <span className={`absolute -right-[26px] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full ${notch}`} />
          </div>
          <div className="text-sm font-medium text-wheat-700">{footer}</div>
        </>
      )}
    </div>
  );
}
