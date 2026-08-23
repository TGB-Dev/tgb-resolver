import type { InjectionKey, Ref } from "vue";

/**
 * Row-level hover state for timeline rows. Provided by `timeline-table-item`
 * and injected by the hover-reactive leaves (add buttons, manual-interaction
 * toggle) so flipping it never re-renders the whole row subtree.
 */
export const timelineRowHoverKey: InjectionKey<Ref<boolean>> = Symbol("timeline-row-hover");
