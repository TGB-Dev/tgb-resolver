export enum Cue {
  CURRENT = "CURRENT",
  NEXT = "NEXT",
  PREVIOUS = "PREVIOUS",
}

export const CUE_CONFIG: Record<Cue, { label: string; headingSize: string; contentSize: string }> =
  {
    [Cue.CURRENT]: { label: "Current", headingSize: "3xl", contentSize: "2xl" },
    [Cue.NEXT]: { label: "Next", headingSize: "2xl", contentSize: "xl" },
    [Cue.PREVIOUS]: { label: "Previous", headingSize: "xl", contentSize: "lg" },
  };
