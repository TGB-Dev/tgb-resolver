import { atom } from "jotai";

import { getServerNow } from "@/lib/api";

export const controlNowAtom = atom(getServerNow());
