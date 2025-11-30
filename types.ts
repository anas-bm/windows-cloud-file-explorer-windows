
export type FileType = 'root' | 'drive' | 'folder' | 'file' | 'image' | 'pdf' | 'excel' | 'word' | 'video' | 'audio' | 'app';

export interface FileSystemItem {
  id: string;
  parentId: string | null;
  name: string;
  type: FileType;
  size?: number; // in bytes
  date?: string;
  icon?: string; // Custom icon identifier
  src?: string; // For images/media content
  cover?: string; // For audio album art
  content?: string | File | Blob; // Actual file content if needed
  isTrashed?: boolean; // If true, item is in recycle bin
}

export interface Tab {
  id: string;
  path: string;
  title: string;
  history?: string[];
  currentIndex?: number;
}

export interface SortConfig {
  key: 'name' | 'date' | 'size' | 'type';
  direction: 'asc' | 'desc';
}

export interface SelectionBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface UserAccount {
  handle: string; // Unique identifier starting with @
  displayName: string; // Display name shown on lock screen
  pin: string; // The "Code"
  avatar?: string;
}
