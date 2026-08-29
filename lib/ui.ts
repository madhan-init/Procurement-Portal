/* ─────────────────────────────────────────────────────────────
   Shared class tokens for the coral/ink screens (login, book).
   One place to change so the two screens can't drift apart.

     ink        #111111   headings, button labels, selected fills
     ink-muted  #6B7280   subtitle, helper text
     ink-faint  #A0A3A8   divider label, footer, disabled
     line       #E4E4E7   input + button borders
     brand      #FB8A61   commit fill        (hover #F5794A)
     brand-ink  #E8632A   links, logo accent
     danger     #E5484D   error text
     danger-ln  #F0A9A4   invalid input border

   Coral marks what you picked and commits it; ink is for text and
   headings. Selected fills use the same coral as the commit button.
   ───────────────────────────────────────────────────────────── */

/** 56px field. Compose with FIELD_LINE or FIELD_BAD for the border. */
export const FIELD =
  "h-14 w-full rounded-xl border bg-white px-4 text-[16px] text-[#111111] placeholder:text-[#A0A3A8] outline-none transition-colors focus:border-[#FB8A61] focus:ring-4 focus:ring-[#FB8A61]/15";
export const FIELD_LINE = "border-[#E4E4E7]";
export const FIELD_BAD = "border-[#F0A9A4] bg-[#FFFBFB]";

export const LABEL = "block text-[15px] font-semibold text-[#111111]";
export const HELP = "text-[15px] text-[#6B7280]";
export const LINK = "font-medium text-[#E8632A] underline-offset-4 hover:underline";
export const FOOTNOTE = "text-center text-[13px] text-[#A0A3A8]";

/** The one coral action per screen. */
export const COMMIT =
  "flex h-14 w-full items-center justify-center rounded-xl bg-[#FB8A61] text-[16px] font-semibold text-white transition-colors hover:bg-[#F5794A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8632A] disabled:cursor-not-allowed disabled:opacity-60";
/** Secondary action — same footprint, no fill. */
export const GHOST =
  "flex h-14 w-full items-center justify-center rounded-xl border border-[#E4E4E7] bg-white text-[16px] font-semibold text-[#111111] transition-colors hover:bg-[#FAFAFA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FB8A61] disabled:cursor-not-allowed disabled:opacity-60";

/** Inline chip choice (dates). Compose with PICK_ON / PICK_OFF. */
export const CHIP =
  "shrink-0 rounded-xl border px-4 py-2.5 text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FB8A61]";
/** Full-width card choice (time windows). Compose with PICK_ON / PICK_OFF. */
export const PICK =
  "w-full rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FB8A61]";
export const PICK_ON = "border-[#FB8A61] bg-[#FB8A61] text-white";
export const PICK_OFF = "border-[#E4E4E7] bg-white text-[#111111] hover:bg-[#FAFAFA]";
export const PICK_DEAD = "cursor-not-allowed border-[#EFEFF1] bg-[#FAFAFA] text-[#A0A3A8]";

export const SHELL = "min-h-screen bg-white font-sans antialiased";
export const HEADER = "flex items-center justify-between gap-4 px-8 pt-7";
export const COLUMN = "w-full max-w-[456px]";
export const H1 =
  "text-center text-[34px] font-bold leading-[1.15] tracking-[-0.02em] text-[#111111]";
export const SUB = "mt-2 text-center text-[17px] text-[#6B7280]";

/* ── Dense surfaces (admin) ───────────────────────────────────
   Same palette, radius, and type as the farmer screens — just a
   compact footprint. The full-height COMMIT/GHOST/FIELD above are
   for one-action-per-screen columns; these are for toolbars,
   table rows and sticky bars.
   ─────────────────────────────────────────────────────────── */
export const CARD = "rounded-xl border border-[#E4E4E7] bg-white";

/** 40px coral action. */
export const COMMIT_SM =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FB8A61] px-4 text-[15px] font-semibold text-white transition-colors hover:bg-[#F5794A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8632A] disabled:cursor-not-allowed disabled:opacity-40";
/** 40px secondary action. */
export const GHOST_SM =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#E4E4E7] bg-white px-4 text-[15px] font-semibold text-[#111111] transition-colors hover:bg-[#FAFAFA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FB8A61] disabled:cursor-not-allowed disabled:opacity-40";
/** In-row coral action. */
export const COMMIT_XS =
  "inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-[#FB8A61] px-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#F5794A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8632A] disabled:cursor-not-allowed disabled:opacity-40";
/** In-row text action; pass a colour class for danger. */
export const LINK_XS =
  "whitespace-nowrap text-[13px] font-medium underline-offset-2 transition-colors hover:underline disabled:cursor-not-allowed disabled:opacity-40";

/** 40px field, for toolbars and table cells. */
export const FIELD_SM =
  "h-10 rounded-xl border border-[#E4E4E7] bg-white px-3 text-[15px] text-[#111111] outline-none transition-colors focus:border-[#FB8A61] focus:ring-4 focus:ring-[#FB8A61]/15";

export const TABLE = "w-full text-left text-[14px]";
export const THEAD = "border-b border-[#E4E4E7]";
export const TH = "px-4 py-3 text-[12px] font-bold uppercase tracking-[0.06em] text-[#A0A3A8]";
export const TR = "border-b border-[#EFEFF1] last:border-0";
export const TD = "px-4 py-3";

/** Page heading for dense screens — left-aligned, smaller than H1. */
export const H2_PAGE = "text-[26px] font-bold tracking-[-0.02em] text-[#111111]";
export const NOTE = "mt-1 text-[15px] text-[#6B7280]";

/** Feedback strips. */
export const TOAST_OK = "mt-3 rounded-xl bg-[#FFF1EB] px-4 py-2.5 text-[15px] text-[#C2521E]";
export const TOAST_ERR = "mt-3 rounded-xl bg-[#FEF1F1] px-4 py-2.5 text-[15px] text-[#B4383C]";
