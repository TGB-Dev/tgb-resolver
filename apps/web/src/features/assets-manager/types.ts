export enum ViewMode {
  List = "list",
  Grid = "grid",
}

export enum FocusedPanel {
  Tree = "tree",
  Content = "content",
}

export enum ClipboardMode {
  Copy = "copy",
  Cut = "cut",
}

export enum DropEffect {
  Copy = "copy",
  Move = "move",
}

export interface FsEntry {
  id: string;
  name: string;
  isDirectory: boolean;
  children?: FsEntry[];
  contentType?: string;
  sizeBytes?: number;
  parentId?: string;
}
