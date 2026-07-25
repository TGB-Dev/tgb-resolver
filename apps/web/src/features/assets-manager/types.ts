export type ViewMode = "list" | "grid";

export interface FsEntry {
  id: string;
  name: string;
  isDirectory: boolean;
  children?: FsEntry[];
  contentType?: string;
  sizeBytes?: number;
  parentId?: string;
}
