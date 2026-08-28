import Link from "next/link";

/** Token display for the coral/ink screens: monumental Outfit numeral on a
 *  white card. Used on Home (tappable, → tracker), booking success, and the
 *  tracker — it replaced the wheat "parchi" TokenSlip on all three, so that
 *  component is now unreferenced. */
export default function TokenCard({
  heading,
  token,
  line1,
  line2,
  footer,
  href,
}: {
  heading: string;
  token: number;
  line1?: string;
  line2?: string;
  footer?: React.ReactNode;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-[12px] font-bold uppercase tracking-[0.11em] text-[#A0A3A8]">{heading}</p>
      <p className="mt-1.5 font-heading text-[76px] font-extrabold leading-none tracking-[-0.04em] text-[#111111]">
        #{token}
      </p>
      {line1 && <p className="mt-2 text-[15px] font-medium text-[#111111]">{line1}</p>}
      {line2 && <p className="mt-0.5 text-[15px] text-[#6B7280]">{line2}</p>}
      {footer && (
        <>
          <div className="my-5 h-px bg-[#E4E4E7]" />
          <div className="text-[15px] text-[#6B7280]">{footer}</div>
        </>
      )}
    </>
  );

  const shell = "block rounded-xl border border-[#E4E4E7] bg-white p-6 text-center";
  return href ? (
    <Link href={href} className={`${shell} transition-colors hover:bg-[#FAFAFA]`}>
      {body}
    </Link>
  ) : (
    <div className={shell}>{body}</div>
  );
}
