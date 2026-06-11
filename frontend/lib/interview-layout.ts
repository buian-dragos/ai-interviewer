export const CORE_QUESTIONS_TOTAL = 5;

export const INTERVIEW_ANSWER_MAX_CHARS = 2500;

/** Fills SidebarInset; enables sticky footer layout. */
export const INTERVIEW_PAGE_MAIN_CLASS =
  "flex min-h-0 flex-1 flex-col items-center p-6";

export const INTERVIEW_PAGE_INNER_CLASS =
  "flex min-h-0 w-full max-w-4xl flex-1 flex-col";

export const INTERVIEW_CONTENT_CLASS = "mx-auto w-full max-w-2xl";

/** Fixed slot so composer position does not shift with question length. */
export const INTERVIEW_QUESTION_SLOT_CLASS =
  "mt-10 flex h-32 shrink-0 flex-col overflow-y-auto overscroll-y-contain md:mt-14 md:h-36";

/** Grows between question slot and nav; composer sits lower (2:1 spacer ratio). */
export const INTERVIEW_MIDDLE_CLASS = "flex min-h-0 flex-1 flex-col";

export const INTERVIEW_MIDDLE_TOP_SPACER_CLASS = "min-h-0 flex-[2]";

export const INTERVIEW_MIDDLE_BOTTOM_SPACER_CLASS = "min-h-0 flex-1";

export const INTERVIEW_COMPOSER_SLOT_CLASS = "w-full shrink-0";

/** Sticky wizard nav — safe-area aware, separated from content. */
export const INTERVIEW_NAV_FOOTER_CLASS =
  "sticky bottom-0 z-10 w-full shrink-0 border-t border-border bg-background/95 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm supports-[backdrop-filter]:bg-background/80";

export const INTERVIEW_ANSWER_TEXTAREA_CLASS =
  "min-h-72 w-full resize-y px-4 pt-4 pb-10 text-base touch-manipulation md:min-h-80";
