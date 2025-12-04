
import React, { useState, useEffect, useRef } from 'react';
import { 
  Monitor, Star, HardDrive, ChevronRight, ArrowLeft, ArrowUp, RotateCw, 
  Search, Plus, Copy, Scissors, Trash2, Share2, LayoutGrid, List as ListIcon, 
  X, Minus, Square, ChevronDown, Upload, Folder, FolderPlus, FileText,
  Settings, Moon, Ghost, Palette, Play, Music, Image as ImageIcon, Video, Disc, Camera, UploadCloud, Download,
  RotateCcw, LogOut, User, Key, ImagePlus, Eye, EyeOff
} from 'lucide-react';
import { FileSystemItem, Tab, SelectionBox, SortConfig, UserAccount } from '../types';
import { FileIcon, FolderIconDetailed, DriveIconDetailed } from './FileIcon';
import { loadFileSystemFromDB, saveFileToDB, deleteFileFromDB, saveAllToDB } from '../utils/db';
import LockScreen from './LockScreen';

// --- Initial Data (Clean, No Defaults) ---
const INITIAL_FILES: FileSystemItem[] = [
  { id: 'root', name: 'This PC', type: 'root', parentId: null },
  { id: 'desktop', name: 'Desktop', type: 'folder', parentId: 'root', icon: 'desktop' },
  { id: 'documents', name: 'Documents', type: 'folder', parentId: 'root', icon: 'documents' },
  { id: 'downloads', name: 'Downloads', type: 'folder', parentId: 'root', icon: 'downloads' },
  { id: 'pictures', name: 'Pictures', type: 'folder', parentId: 'root', icon: 'pictures' },
  { id: 'music', name: 'Music', type: 'folder', parentId: 'root', icon: 'music' },
  { id: 'videos', name: 'Videos', type: 'folder', parentId: 'root', icon: 'videos' },
  { id: 'c_drive', name: 'Local Disk (C:)', type: 'drive', parentId: 'root', icon: 'drive', size: 483183820800 },
];

const DEFAULT_BACKGROUNDS = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop', // Blue Bloom
  'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=80&w=2070&auto=format&fit=crop', // Mountain
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop', // Lake
  'https://images.unsplash.com/photo-1536532184021-da4272366502?q=80&w=2076&auto=format&fit=crop'  // Sunset
];

const SIDEBAR_ITEMS = [
    { id: 'desktop', label: 'Desktop' },
    { id: 'downloads', label: 'Downloads' },
    { id: 'documents', label: 'Documents' },
    { id: 'pictures', label: 'Pictures' },
    { id: 'music', label: 'Music' },
    { id: 'videos', label: 'Videos' },
];

const formatSize = (bytes?: number) => {
  if (bytes === undefined) return '';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getBreadcrumbs = (fileSystem: FileSystemItem[], currentId: string) => {
  if (currentId === 'trash') {
      return [{ id: 'trash', name: 'Recycle Bin', type: 'folder', parentId: null }];
  }

  const breadcrumbs: FileSystemItem[] = [];
  let current = fileSystem.find(f => f.id === currentId);
  while (current) {
    breadcrumbs.unshift(current);
    if (!current.parentId) break;
    current = fileSystem.find(f => f.id === current.parentId);
  }
  return breadcrumbs;
};

export default function WindowsExplorer() {
  // Authentication
  const [user, setUser] = useState<UserAccount | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // File System
  const [fileSystem, setFileSystem] = useState<FileSystemItem[]>(INITIAL_FILES);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [tabs, setTabs] = useState<Tab[]>(() => {
    return [{ id: '1', path: 'root', title: 'This PC', history: ['root'], currentIndex: 0 }];
  });
  
  const [activeTabId, setActiveTabId] = useState('1');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [clipboard, setClipboard] = useState<{ action: 'copy' | 'cut' | null, items: string[] }>({ action: null, items: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Deletion States
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [trashAction, setTrashAction] = useState<'delete' | 'empty'>('delete');
  
  // Password Change State
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [changePassData, setChangePassData] = useState({ current: '', new: '', confirm: '' });
  const [changePassError, setChangePassError] = useState('');
  const [showPassReveals, setShowPassReveals] = useState({ current: false, new: false, confirm: false });

  const [customBackgrounds, setCustomBackgrounds] = useState<string[]>(() => {
      const saved = localStorage.getItem('win11_bgs');
      return saved ? JSON.parse(saved) : [];
  });
  
  // Appearance State
  const [theme, setTheme] = useState(() => {
      const saved = localStorage.getItem('win11_theme');
      return saved ? JSON.parse(saved) : {
          isDark: false,
          isTransparent: false,
          backgroundImage: DEFAULT_BACKGROUNDS[0]
      };
  });

  // Preview State
  const [previewItem, setPreviewItem] = useState<FileSystemItem | null>(null);

  // Drag & Select State
  const [draggedItems, setDraggedItems] = useState<string[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const userAvatarInputRef = useRef<HTMLInputElement>(null);
  const filesViewRef = useRef<HTMLDivElement>(null);
  const explorerRef = useRef<HTMLDivElement>(null);
  
  // Menu Refs for Click Outside
  const newMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Derived State
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const currentPath = activeTab.path;
  const currentFolder = fileSystem.find(f => f.id === currentPath) || (currentPath === 'trash' ? { id: 'trash', name: 'Recycle Bin', type: 'folder', parentId: null } : fileSystem[0]);
  const allBackgrounds = [...DEFAULT_BACKGROUNDS, ...customBackgrounds];

  const currentFiles = fileSystem
    .filter(f => {
        if (currentPath === 'trash') {
            return f.isTrashed;
        }
        return f.parentId === currentPath && !f.isTrashed && f.name.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      if (sortConfig.key === 'name') {
        return sortConfig.direction === 'asc' 
          ? a.name.localeCompare(b.name) 
          : b.name.localeCompare(a.name);
      }
      return 0;
    });

  // --- Persistence & Initialization ---
  useEffect(() => {
      const savedUser = localStorage.getItem('win11_user');
      if (savedUser) {
          setUser(JSON.parse(savedUser));
      }
  }, []);

  useEffect(() => {
    const init = async () => {
        try {
            const items = await loadFileSystemFromDB();
            if (items.length > 0) {
                if (!items.find(i => i.id === 'root')) {
                    setFileSystem([...INITIAL_FILES, ...items]);
                } else {
                    setFileSystem(items);
                }
            } else {
                 for (const item of INITIAL_FILES) {
                     await saveFileToDB(item).catch(console.error);
                 }
            }
        } catch (e) {
            console.error("Failed to load DB", e);
        } finally {
            setIsLoaded(true);
        }
    };
    init();
  }, []);

  useEffect(() => {
      localStorage.setItem('win11_theme', JSON.stringify(theme));
  }, [theme]);
  
  useEffect(() => {
      localStorage.setItem('win11_bgs', JSON.stringify(customBackgrounds));
  }, [customBackgrounds]);

  useEffect(() => {
      if (user) {
          localStorage.setItem('win11_user', JSON.stringify(user));
      }
  }, [user]);

  // --- Click Outside Handler ---
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (newMenuRef.current && !newMenuRef.current.contains(event.target as Node)) {
              setShowNewMenu(false);
          }
          if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
              setShowSettings(false);
          }
          if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
              setShowUserMenu(false);
          }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
          document.removeEventListener('mousedown', handleClickOutside);
      };
  }, []);

  // --- Keyboard Delete Handler ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') return;

        if (e.key === 'Delete' && selectedItems.length > 0 && !isRenaming && !showDeleteConfirm && !showSettings && !showNewMenu && !showChangePassModal) {
            setTrashAction('delete');
            setShowDeleteConfirm(true);
        }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItems, isRenaming, showDeleteConfirm, showSettings, showNewMenu, showChangePassModal]);

  // --- Handlers ---

  const handleLogin = (authenticatedUser: UserAccount) => {
      setUser(authenticatedUser);
      setIsLoggedIn(true);
  };

  const handleLogout = () => {
      setIsLoggedIn(false);
      setShowSettings(false);
      setShowUserMenu(false);
  };

  const handleChangeUserAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && user) {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target && event.target.result) {
                const url = event.target.result as string;
                setUser({ ...user, avatar: url });
            }
        };
        reader.readAsDataURL(e.target.files[0]);
      }
      setShowUserMenu(false);
  };

  const handleChangePasswordClick = () => {
      setChangePassData({ current: '', new: '', confirm: '' });
      setChangePassError('');
      setShowChangePassModal(true);
      setShowUserMenu(false);
  };
  
  const submitChangePassword = () => {
      if (!user) return;
      if (changePassData.current !== user.pin) {
          setChangePassError("Incorrect current code.");
          return;
      }
      if (changePassData.new.length < 4) {
          setChangePassError("New code must be at least 4 chars.");
          return;
      }
      if (changePassData.new !== changePassData.confirm) {
          setChangePassError("New codes do not match.");
          return;
      }
      
      setUser({ ...user, pin: changePassData.new });
      setShowChangePassModal(false);
      // Optional: Show a toast notification
  };

  const handleNavigate = (folderId: string, replace = false) => {
    if (folderId === 'trash') {
        setTabs(prev => prev.map(t => t.id === activeTabId ? {
            ...t,
            path: 'trash',
            title: 'Recycle Bin',
            history: [...(t.history || []), 'trash'],
            currentIndex: (t.currentIndex || 0) + 1
        } : t));
        setSelectedItems([]);
        return;
    }

    const targetFolder = fileSystem.find(f => f.id === folderId);
    if (targetFolder) {
      setTabs(prev => prev.map(t => {
          if (t.id === activeTabId) {
              const history = t.history || [t.path];
              const currentIndex = t.currentIndex ?? (history.length - 1);
              
              let newHistory = history;
              let newIndex = currentIndex;

              if (!replace) {
                  newHistory = history.slice(0, currentIndex + 1);
                  newHistory.push(folderId);
                  newIndex = newHistory.length - 1;
              }

              return { 
                  ...t, 
                  path: folderId, 
                  title: targetFolder.name,
                  history: newHistory,
                  currentIndex: newIndex
              };
          }
          return t;
      }));
      setSelectedItems([]);
      setSearchQuery('');
    }
  };

  const handleBack = () => {
      if (!activeTab.history || activeTab.currentIndex === undefined || activeTab.currentIndex <= 0) return;
      const newIndex = activeTab.currentIndex - 1;
      const prevPath = activeTab.history[newIndex];
      
      if (prevPath === 'trash') {
          setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, path: 'trash', title: 'Recycle Bin', currentIndex: newIndex } : t));
          return;
      }

      const targetFolder = fileSystem.find(f => f.id === prevPath);
      if (targetFolder) {
          setTabs(prev => prev.map(t => t.id === activeTabId ? {
              ...t,
              path: prevPath,
              title: targetFolder.name,
              currentIndex: newIndex
          } : t));
          setSelectedItems([]);
      }
  };

  const handleForward = () => {
      if (!activeTab.history || activeTab.currentIndex === undefined || activeTab.currentIndex >= activeTab.history.length - 1) return;
      const newIndex = activeTab.currentIndex + 1;
      const nextPath = activeTab.history[newIndex];

      if (nextPath === 'trash') {
          setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, path: 'trash', title: 'Recycle Bin', currentIndex: newIndex } : t));
          return;
      }

      const targetFolder = fileSystem.find(f => f.id === nextPath);
      if (targetFolder) {
          setTabs(prev => prev.map(t => t.id === activeTabId ? {
              ...t,
              path: nextPath,
              title: targetFolder.name,
              currentIndex: newIndex
          } : t));
          setSelectedItems([]);
      }
  };

  const handleGoUp = () => {
    if (currentPath === 'trash') {
        handleNavigate('root');
        return;
    }
    // @ts-ignore
    if (currentFolder.parentId) handleNavigate(currentFolder.parentId);
  };

  const handleOpenItem = (item: FileSystemItem) => {
      if (currentPath === 'trash') return; 
      
      if (item.type === 'folder' || item.type === 'drive' || item.type === 'root') {
          handleNavigate(item.id);
      } else if (['image', 'video', 'audio'].includes(item.type)) {
          setPreviewItem(item);
      }
  };

  // --- Download Logic ---
  const handleDownload = async () => {
      if (selectedItems.length === 0) return;

      if (selectedItems.length === 1) {
          const item = fileSystem.find(f => f.id === selectedItems[0]);
          if (item && item.type !== 'folder' && item.type !== 'drive') {
              const link = document.createElement('a');
              if (item.content instanceof File || item.content instanceof Blob) {
                   link.href = URL.createObjectURL(item.content);
              } else if (item.src) {
                   link.href = item.src;
              } else {
                   const blob = new Blob([''], { type: 'text/plain' });
                   link.href = URL.createObjectURL(blob);
              }
              link.download = item.name;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              return;
          }
      }

      // @ts-ignore
      if (!window.JSZip) {
          alert("Compression library not loaded. Please wait or refresh.");
          return;
      }

      // @ts-ignore
      const zip = new window.JSZip();
      
      const addFolderToZip = async (zipFolder: any, folderId: string) => {
          const children = fileSystem.filter(f => f.parentId === folderId && !f.isTrashed);
          for (const child of children) {
              if (child.type === 'folder') {
                  const newFolder = zipFolder.folder(child.name);
                  await addFolderToZip(newFolder, child.id);
              } else {
                  if (child.content instanceof File || child.content instanceof Blob) {
                      zipFolder.file(child.name, child.content);
                  } else if (child.src) {
                      try {
                          const response = await fetch(child.src);
                          const blob = await response.blob();
                          zipFolder.file(child.name, blob);
                      } catch (e) { }
                  } else {
                      zipFolder.file(child.name, "");
                  }
              }
          }
      };

      for (const id of selectedItems) {
          const item = fileSystem.find(f => f.id === id);
          if (!item) continue;

          if (item.type === 'folder') {
              const folder = zip.folder(item.name);
              await addFolderToZip(folder, item.id);
          } else {
              if (item.content instanceof File || item.content instanceof Blob) {
                  zip.file(item.name, item.content);
              } else if (item.src) {
                   try {
                      const response = await fetch(item.src);
                      const blob = await response.blob();
                      zip.file(item.name, blob);
                   } catch(e) {}
              } else {
                  zip.file(item.name, "");
              }
          }
      }

      zip.generateAsync({ type: "blob" }).then((content: Blob) => {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(content);
          link.download = selectedItems.length === 1 ? `${fileSystem.find(f => f.id === selectedItems[0])?.name}.zip` : "files.zip";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      });
  };

  // --- Upload Logic ---
  const handleFileUploadTrigger = (isFolder: boolean) => {
    if (isFolder) {
        if (folderInputRef.current) folderInputRef.current.click();
    } else {
        if (fileInputRef.current) fileInputRef.current.click();
    }
    setShowNewMenu(false);
  };

  const extractAudioMetadata = (file: File, fileId: string) => {
    // @ts-ignore
    if (window.jsmediatags) {
        // @ts-ignore
        window.jsmediatags.read(file, {
            onSuccess: (tag: any) => {
                const picture = tag.tags.picture;
                if (picture) {
                    try {
                        const { data, format } = picture;
                        const byteArray = new Uint8Array(data);
                        const blob = new Blob([byteArray], { type: format });
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            if (e.target?.result) {
                                const coverUrl = e.target.result as string;
                                setFileSystem(prev => {
                                    // Functional update for state
                                    const updated = prev.map(f => f.id === fileId ? { ...f, cover: coverUrl } : f);
                                    
                                    // Trigger side-effect (DB Save) separately to avoid race conditions in Strict Mode
                                    const item = updated.find(f => f.id === fileId);
                                    if(item) saveFileToDB(item).catch(console.error);
                                    
                                    return updated;
                                });
                                setPreviewItem(prev => (prev && prev.id === fileId) ? { ...prev, cover: coverUrl } : prev);
                            }
                        };
                        reader.readAsDataURL(blob);
                    } catch (e) { console.error(e); }
                }
            },
            onError: (error: any) => { console.log('Error reading tags:', error); }
        });
    }
  };

  const processFiles = async (files: FileList) => {
     const newItems: FileSystemItem[] = [];
     const createdFolders = new Map<string, string>();

     const getOrCreateFolder = (pathSegments: string[], parentId: string): string => {
        let currentParent = parentId;
        let currentPathStr = '';

        for (const segment of pathSegments) {
            currentPathStr = currentPathStr ? `${currentPathStr}/${segment}` : segment;
            const uniqueKey = `${parentId}/${currentPathStr}`;
            
            if (createdFolders.has(uniqueKey)) {
                currentParent = createdFolders.get(uniqueKey)!;
            } else {
                const existing = fileSystem.find(f => f.parentId === currentParent && f.name === segment && f.type === 'folder' && !f.isTrashed);
                if (existing) {
                    currentParent = existing.id;
                    createdFolders.set(uniqueKey, existing.id);
                } else {
                    const newId = `folder_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                    const newFolder: FileSystemItem = {
                        id: newId,
                        name: segment,
                        type: 'folder',
                        parentId: currentParent,
                        date: new Date().toISOString().split('T')[0]
                    };
                    saveFileToDB(newFolder).catch(console.error);
                    if(!newItems.find(i => i.id === newId)) newItems.push(newFolder);
                    currentParent = newId;
                    createdFolders.set(uniqueKey, newId);
                }
            }
        }
        return currentParent;
     };

     for (const file of Array.from(files)) {
        try {
            const relativePath = file.webkitRelativePath || file.name;
            const parts = relativePath.split('/');
            const fileName = parts.pop()!;
            const folderParts = parts;

            const parentId = folderParts.length > 0 ? getOrCreateFolder(folderParts, currentPath) : currentPath;

            let type: any = 'file';
            let src = undefined;
            
            if (file.type.startsWith('image/')) {
                type = 'image';
                src = URL.createObjectURL(file);
            } else if (file.type.includes('pdf')) type = 'pdf';
            else if (file.type.includes('excel') || file.type.includes('sheet')) type = 'excel';
            else if (file.type.includes('word') || file.type.includes('document')) type = 'word';
            else if (file.type.startsWith('video/')) {
                type = 'video';
                src = URL.createObjectURL(file);
            } else if (file.type.startsWith('audio/')) {
                type = 'audio';
                src = URL.createObjectURL(file);
            }

            const newId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
            const newItem: FileSystemItem = {
                id: newId,
                name: fileName,
                type,
                parentId,
                size: file.size,
                date: new Date().toISOString().split('T')[0],
                src,
                content: file 
            };
            newItems.push(newItem);
            await saveFileToDB(newItem);

            if (type === 'audio') {
                extractAudioMetadata(file, newId);
            }
        } catch(e) {
            console.error("Error processing file", file.name, e);
        }
     }

     setFileSystem(prev => [...prev, ...newItems]);
     const topLevelNewItems = newItems.filter(i => i.parentId === currentPath);
     if (topLevelNewItems.length > 0) {
         setSelectedItems(topLevelNewItems.map(i => i.id));
     }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
    }
    e.target.value = ''; 
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target && event.target.result) {
                const url = event.target.result as string;
                setCustomBackgrounds(prev => [...prev, url]);
                setTheme(p => ({ ...p, backgroundImage: url }));
            }
          };
          reader.readAsDataURL(e.target.files[0]);
      }
      e.target.value = '';
  };

  const handleDeleteBg = (bg: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setCustomBackgrounds(prev => prev.filter(b => b !== bg));
      if (theme.backgroundImage === bg) {
          setTheme(p => ({ ...p, backgroundImage: DEFAULT_BACKGROUNDS[0] }));
      }
  };

  const handleChangeCover = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && previewItem) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target && event.target.result) {
                const url = event.target.result as string;
                setFileSystem(prev => {
                    const updated = prev.map(f => f.id === previewItem.id ? { ...f, cover: url } : f);
                    const item = updated.find(f => f.id === previewItem.id);
                    if (item) saveFileToDB(item).catch(console.error);
                    return updated;
                });
                setPreviewItem(prev => prev ? { ...prev, cover: url } : null);
            }
          };
          reader.readAsDataURL(e.target.files[0]);
      }
      e.target.value = '';
  };

  // --- Drag & Drop ---
  const handleDrop = async (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      e.stopPropagation();

      try {
          const data = e.dataTransfer.getData('text/plain');
          if (data) {
              const movedIds = JSON.parse(data) as string[];
              if (movedIds && movedIds.length > 0) {
                  // Move items in State
                  const newItems = fileSystem.map(f => 
                       movedIds.includes(f.id) && f.parentId !== targetId 
                          ? { ...f, parentId: targetId } 
                          : f
                  );
                  setFileSystem(newItems);

                  // Update DB
                  movedIds.forEach(id => {
                      const item = newItems.find(f => f.id === id);
                      if(item) saveFileToDB(item).catch(console.error);
                  });
                  
                  setSelectedItems([]);
                  return;
              }
          }
      } catch (err) { /* ignore */ }

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          if (targetId === currentPath) {
             processFiles(e.dataTransfer.files);
          } else {
             setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, path: targetId } : t));
             setTimeout(() => processFiles(e.dataTransfer.files), 100);
          }
      }
  };

  // --- Marquee Selection ---
  const handleSelectionStart = (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.file-item') || target.closest('button') || target.closest('input')) return;
      
      e.preventDefault();
      
      const container = filesViewRef.current;
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      const scrollLeft = container.scrollLeft;
      const scrollTop = container.scrollTop;

      const startX = e.clientX - containerRect.left + scrollLeft;
      const startY = e.clientY - containerRect.top + scrollTop;

      setIsSelecting(true);
      setSelectionBox({ x1: startX, y1: startY, x2: startX, y2: startY });
      setSelectedItems([]);

      const handleMouseMove = (moveEvent: MouseEvent) => {
          const curX = moveEvent.clientX - containerRect.left + container.scrollLeft;
          const curY = moveEvent.clientY - containerRect.top + container.scrollTop;
          
          setSelectionBox(prev => prev ? { ...prev, x2: curX, y2: curY } : null);

          const boxRect = {
              left: Math.min(moveEvent.clientX, e.clientX),
              top: Math.min(moveEvent.clientY, e.clientY),
              right: Math.max(moveEvent.clientX, e.clientX),
              bottom: Math.max(moveEvent.clientY, e.clientY)
          };

          const newSelection: string[] = [];
          const fileElements = container.querySelectorAll('.file-item');
          
          fileElements.forEach((el) => {
              const rect = el.getBoundingClientRect();
              if (
                  boxRect.left < rect.right &&
                  boxRect.right > rect.left &&
                  boxRect.top < rect.bottom &&
                  boxRect.bottom > rect.top
              ) {
                  const id = (el as HTMLElement).dataset.id;
                  if (id) newSelection.push(id);
              }
          });
          setSelectedItems(newSelection);
      };

      const handleMouseUp = () => {
          setIsSelecting(false);
          setSelectionBox(null);
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
  };

  // --- Keyboard Shortcuts & Utilities ---
  const handleRename = () => {
      if (selectedItems.length === 1) {
          const file = fileSystem.find(f => f.id === selectedItems[0]);
          if (file) {
              setIsRenaming(file.id);
              setRenameValue(file.name);
          }
      }
  };

  const handleRenameSubmit = (e?: React.FormEvent) => {
      e?.preventDefault();
      if (isRenaming && renameValue.trim()) {
          const updated = fileSystem.map(f => f.id === isRenaming ? { ...f, name: renameValue } : f);
          setFileSystem(updated);
          
          const item = updated.find(f => f.id === isRenaming);
          if (item) saveFileToDB(item).catch(console.error);
      }
      setIsRenaming(null);
  };

  const deleteItems = () => {
      if(selectedItems.length > 0) {
          setTrashAction('delete');
          setShowDeleteConfirm(true);
      }
  };
  
  const confirmDelete = () => {
      if (trashAction === 'empty') {
          const trashItems = fileSystem.filter(f => f.isTrashed);
          setFileSystem(prev => prev.filter(f => !f.isTrashed));
          trashItems.forEach(f => deleteFileFromDB(f.id).catch(console.error));
      } else {
          // Normal delete action
          if (currentPath === 'trash') {
              // Delete permanently selected items in trash
              setFileSystem(prev => prev.filter(f => !selectedItems.includes(f.id)));
              selectedItems.forEach(id => deleteFileFromDB(id).catch(console.error));
          } else {
              // Soft delete: Move to Trash
              const updated = fileSystem.map(f => selectedItems.includes(f.id) ? { ...f, isTrashed: true } : f);
              setFileSystem(updated);
              
              selectedItems.forEach(id => {
                  const item = updated.find(f => f.id === id);
                  if (item) saveFileToDB(item).catch(console.error);
              });
          }
      }
      
      setSelectedItems([]);
      setShowDeleteConfirm(false);
  };

  const handleRestore = () => {
      if (currentPath === 'trash' && selectedItems.length > 0) {
          const updated = fileSystem.map(f => selectedItems.includes(f.id) ? { ...f, isTrashed: false } : f);
          setFileSystem(updated);
          
          selectedItems.forEach(id => {
              const item = updated.find(f => f.id === id);
              if (item) saveFileToDB(item).catch(console.error);
          });
          setSelectedItems([]);
      }
  };

  const handleEmptyTrash = () => {
      setTrashAction('empty');
      setShowDeleteConfirm(true);
  };

  const getContainerStyles = () => {
      let styles = `w-full max-w-6xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-400/30 ring-1 ring-white/20 backdrop-blur-sm transition-all duration-300 relative `;
      if (theme.isDark) {
          styles += theme.isTransparent ? 'bg-gray-900/60 text-white' : 'bg-gray-900 text-white';
      } else {
          styles += theme.isTransparent ? 'bg-[#f3f3f3]/60' : 'bg-[#f3f3f3]';
      }
      return styles;
  };

  if (!isLoggedIn) {
      return <LockScreen onLogin={handleLogin} existingUser={user} bgImage={theme.backgroundImage} />;
  }

  return (
    <div 
        className="flex items-center justify-center min-h-screen bg-cover bg-center p-4 font-sans select-none transition-all duration-500"
        style={{ backgroundImage: `url('${theme.backgroundImage}')` }}
    >
        
        {/* Hidden Inputs */}
        <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileChange} />
        <input type="file" ref={folderInputRef} className="hidden" onChange={handleFileChange} 
            // @ts-ignore
            webkitdirectory="" directory="" 
        />
        <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={handleBgUpload} />
        <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={handleChangeCover} />
        <input type="file" ref={userAvatarInputRef} className="hidden" accept="image/*" onChange={handleChangeUserAvatar} />

        <div ref={explorerRef} className={getContainerStyles()}>
            
            {/* --- Header --- */}
            <div className={`h-10 flex items-end px-2 pt-2 border-b border-gray-300/20 relative shrink-0 ${theme.isDark ? 'bg-black/20' : 'bg-gray-200/50'}`}>
                {/* Tabs Area */}
                <div className="flex-1 flex space-x-1 overflow-x-auto no-scrollbar min-w-0 mr-32 z-10">
                    {tabs.map(tab => (
                        <div 
                            key={tab.id}
                            onClick={() => setActiveTabId(tab.id)}
                            className={`
                                group relative flex-none flex items-center w-[160px] max-w-[200px] h-full px-3 py-1.5 rounded-t-lg cursor-default transition-all duration-200 text-xs
                                ${activeTabId === tab.id 
                                    ? (theme.isDark ? 'bg-gray-800/80 shadow-sm' : 'bg-[#f3f3f3]/90 shadow-sm') 
                                    : 'hover:bg-white/10'}
                            `}
                        >
                            <span className={`truncate font-medium flex-1 ${theme.isDark ? 'text-gray-200' : 'text-gray-700'}`}>{tab.title}</span>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (tabs.length > 1) {
                                        const newTabs = tabs.filter(t => t.id !== tab.id);
                                        setTabs(newTabs);
                                        if (activeTabId === tab.id) setActiveTabId(newTabs[0].id);
                                    }
                                }}
                                className={`ml-2 p-0.5 rounded-full hover:bg-white/20 ${activeTabId === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                    <button 
                        onClick={() => {
                            const newId = Date.now().toString();
                            setTabs([...tabs, { id: newId, path: 'root', title: 'This PC', history: ['root'], currentIndex: 0 }]);
                            setActiveTabId(newId);
                        }}
                        className="px-3 h-full flex items-center justify-center hover:bg-white/10 rounded-t-lg transition-colors"
                    >
                        <Plus size={14} className={theme.isDark ? 'text-gray-300' : 'text-gray-600'} />
                    </button>
                </div>
                
                {/* Window Controls & User Profile */}
                <div className="absolute top-0 right-0 h-full flex items-center pr-2 space-x-1 text-gray-500 z-50">
                    
                    {/* User Profile Menu */}
                    <div className="relative" ref={userMenuRef}>
                        <button 
                            className={`w-7 h-7 rounded-full flex items-center justify-center overflow-hidden transition-colors border border-transparent ${showUserMenu ? 'border-blue-500' : 'hover:bg-gray-300/30'}`}
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            title={user?.displayName}
                        >
                            {user?.avatar ? (
                                <img src={user.avatar} alt="User" className="w-full h-full object-cover" />
                            ) : (
                                <User size={16} />
                            )}
                        </button>
                        {showUserMenu && (
                             <div className="absolute top-full right-0 mt-2 w-56 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl py-2 animate-in fade-in zoom-in-95 origin-top-right text-gray-800 dark:text-gray-100 z-[100] text-sm">
                                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 mb-1">
                                    <div className="font-semibold">{user?.displayName}</div>
                                    <div className="text-xs opacity-60">{user?.handle}</div>
                                </div>
                                <div 
                                    className="px-4 py-2 hover:bg-blue-600 hover:text-white cursor-pointer flex items-center transition-colors dark:text-gray-200"
                                    onClick={() => userAvatarInputRef.current?.click()}
                                >
                                    <ImagePlus size={14} className="mr-3"/> Change Picture
                                </div>
                                <div 
                                    className="px-4 py-2 hover:bg-blue-600 hover:text-white cursor-pointer flex items-center transition-colors dark:text-gray-200"
                                    onClick={handleChangePasswordClick}
                                >
                                    <Key size={14} className="mr-3"/> Change Password
                                </div>
                                <div className="my-1 border-t border-gray-200 dark:border-gray-700"></div>
                                <div 
                                    className="px-4 py-2 hover:bg-red-600 hover:text-white cursor-pointer flex items-center transition-colors text-red-600"
                                    onClick={handleLogout}
                                >
                                    <LogOut size={14} className="mr-3"/> Log Out
                                </div>
                             </div>
                        )}
                    </div>

                    {/* Settings Menu */}
                     <div className="relative" ref={settingsMenuRef}>
                        <button 
                            className={`p-1.5 rounded-md transition-colors ${showSettings ? 'bg-blue-500 text-white' : 'hover:bg-gray-300/30'}`}
                            onClick={() => setShowSettings(!showSettings)}
                            title="Settings"
                        >
                            <Settings size={16}/>
                        </button>
                        {showSettings && (
                            <div className="absolute top-full right-0 mt-2 w-72 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl p-4 animate-in fade-in zoom-in-95 origin-top-right text-gray-800 dark:text-gray-100 z-[100]">
                                <h3 className="text-xs font-bold uppercase tracking-wider mb-3 text-gray-500">Appearance</h3>
                                
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center"><Moon size={14} className="mr-2"/> Dark Mode</div>
                                    <button 
                                        className={`w-10 h-5 rounded-full flex items-center p-1 transition-colors ${theme.isDark ? 'bg-blue-600 justify-end' : 'bg-gray-300 justify-start'}`}
                                        onClick={() => setTheme(p => ({ ...p, isDark: !p.isDark }))}
                                    >
                                        <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
                                    </button>
                                </div>

                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center"><Ghost size={14} className="mr-2"/> Transparency</div>
                                    <button 
                                        className={`w-10 h-5 rounded-full flex items-center p-1 transition-colors ${theme.isTransparent ? 'bg-blue-600 justify-end' : 'bg-gray-300 justify-start'}`}
                                        onClick={() => setTheme(p => ({ ...p, isTransparent: !p.isTransparent }))}
                                    >
                                        <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
                                    </button>
                                </div>

                                <div className="mb-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center"><Palette size={14} className="mr-2"/> Background</div>
                                        <button onClick={() => bgInputRef.current?.click()} className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded hover:bg-blue-600 flex items-center">
                                            <UploadCloud size={10} className="mr-1"/> Add
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {allBackgrounds.map((bg, idx) => (
                                            <div 
                                                key={idx} 
                                                className={`w-full h-10 rounded border-2 cursor-pointer relative group ${theme.backgroundImage === bg ? 'border-blue-500' : 'border-transparent'}`}
                                                style={{ backgroundImage: `url(${bg})`, backgroundSize: 'cover' }}
                                                onClick={() => setTheme(p => ({ ...p, backgroundImage: bg }))}
                                            >
                                                {idx >= DEFAULT_BACKGROUNDS.length && (
                                                    <div 
                                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                                                        onClick={(e) => handleDeleteBg(bg, e)}
                                                    >
                                                        <X size={8} />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="h-4 w-[1px] bg-gray-400/30 mx-1"></div>
                    <button className="p-1.5 hover:bg-gray-300/30 rounded transition-colors"><Minus size={16} /></button>
                    <button className="p-1.5 hover:bg-gray-300/30 rounded transition-colors"><Square size={14} /></button>
                    <button className="p-1.5 hover:bg-red-500 hover:text-white rounded transition-colors"><X size={16} /></button>
                </div>
            </div>

            {/* --- Toolbar --- */}
            <div className={`h-14 border-b flex items-center px-4 space-x-1 shadow-sm z-20 shrink-0 ${theme.isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-[#f3f3f3]/80 border-gray-200'}`}>
                
                {/* Dynamic Toolbar: Normal Mode vs Trash Mode */}
                {currentPath === 'trash' ? (
                    <>
                         <button 
                            className={`flex items-center space-x-2 px-3 py-1.5 rounded hover:bg-white/20 active:scale-95 transition-transform ${theme.isDark ? 'text-gray-200' : 'text-gray-700'} disabled:opacity-50`}
                            onClick={handleRestore}
                            disabled={selectedItems.length === 0}
                        >
                            <div className="p-1 bg-green-600 rounded text-white shadow-sm"><RotateCcw size={14} strokeWidth={3}/></div>
                            <span className="text-sm">Restore</span>
                        </button>
                        <button 
                            className={`flex items-center space-x-2 px-3 py-1.5 rounded hover:bg-white/20 active:scale-95 transition-transform ${theme.isDark ? 'text-gray-200' : 'text-gray-700'}`}
                            onClick={handleEmptyTrash}
                        >
                            <div className="p-1 bg-red-600 rounded text-white shadow-sm"><Trash2 size={14} strokeWidth={3}/></div>
                            <span className="text-sm">Empty Recycle Bin</span>
                        </button>
                         <div className="h-8 w-[1px] bg-gray-400/30 mx-2"></div>
                         <button 
                             className={`p-2 rounded transition-colors disabled:opacity-30 text-red-600 hover:bg-red-100`}
                             disabled={selectedItems.length === 0} 
                             onClick={deleteItems} 
                             title="Delete Permanently"
                         >
                            <Trash2 size={18} />
                        </button>
                    </>
                ) : (
                    <>
                        <div className="relative" ref={newMenuRef}>
                            <button 
                                className={`flex items-center space-x-2 px-3 py-1.5 rounded hover:bg-white/20 active:scale-95 transition-transform ${theme.isDark ? 'text-gray-200' : 'text-gray-700'}`}
                                onClick={() => setShowNewMenu(!showNewMenu)}
                            >
                                <div className="p-1 bg-blue-600 rounded text-white shadow-sm"><Plus size={14} strokeWidth={3}/></div>
                                <span className="text-sm">New</span>
                                <ChevronDown size={12} className="opacity-50"/>
                            </button>
                            {showNewMenu && (
                                <div className="absolute top-full left-0 mt-2 w-48 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl py-1 text-sm z-50 animate-in fade-in zoom-in-95 origin-top-left">
                                    <div className="px-3 py-2 hover:bg-blue-600 hover:text-white cursor-pointer flex items-center transition-colors dark:text-gray-200" onClick={() => {
                                        const newId = `folder_${Date.now()}`;
                                        const newFolder: FileSystemItem = {
                                            id: newId, name: 'New Folder', type: 'folder', parentId: currentPath, date: new Date().toISOString().split('T')[0]
                                        };
                                        setFileSystem(prev => [...prev, newFolder]);
                                        saveFileToDB(newFolder).catch(console.error);
                                        setIsRenaming(newId);
                                        setRenameValue('New Folder');
                                        setShowNewMenu(false);
                                    }}>
                                        <FolderPlus size={16} className="mr-3"/> Folder
                                    </div>
                                    <div className="my-1 border-b border-gray-200 dark:border-gray-700"></div>
                                    <div className="px-3 py-2 hover:bg-blue-600 hover:text-white cursor-pointer flex items-center transition-colors dark:text-gray-200" onClick={() => handleFileUploadTrigger(false)}>
                                        <FileText size={16} className="mr-3"/> File Upload
                                    </div>
                                    <div className="px-3 py-2 hover:bg-blue-600 hover:text-white cursor-pointer flex items-center transition-colors dark:text-gray-200" onClick={() => handleFileUploadTrigger(true)}>
                                        <Folder size={16} className="mr-3"/> Folder Upload
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="h-8 w-[1px] bg-gray-400/30 mx-2"></div>

                        {[
                            { icon: Scissors, action: () => setClipboard({ action: 'cut', items: selectedItems }), title: 'Cut', disabled: selectedItems.length === 0 },
                            { icon: Copy, action: () => setClipboard({ action: 'copy', items: selectedItems }), title: 'Copy', disabled: selectedItems.length === 0 },
                            { icon: LayoutGrid, action: () => {
                                if (clipboard.items.length === 0) return;
                                const itemsToPaste = fileSystem.filter(f => clipboard.items.includes(f.id));
                                const newItems = itemsToPaste.map(item => {
                                    if (clipboard.action === 'cut') return { ...item, parentId: currentPath };
                                    return { 
                                        ...item, 
                                        id: `copy_${Date.now()}_${Math.random()}`, 
                                        name: item.name.replace(/(\.[\w\d_-]+)$/i, ' - Copy$1') || `${item.name} - Copy`,
                                        parentId: currentPath 
                                    };
                                });
                                
                                if (clipboard.action === 'cut') {
                                    setFileSystem(prev => prev.map(f => clipboard.items.includes(f.id) ? { ...f, parentId: currentPath } : f));
                                    itemsToPaste.forEach(item => saveFileToDB({ ...item, parentId: currentPath }).catch(console.error));
                                    setClipboard({ action: null, items: [] });
                                } else {
                                    setFileSystem(prev => [...prev, ...newItems]);
                                    newItems.forEach(item => saveFileToDB(item).catch(console.error));
                                }
                            }, title: 'Paste', disabled: clipboard.items.length === 0, className: "rotate-45" },
                            { icon: null, label: "ab", action: handleRename, title: 'Rename', disabled: selectedItems.length !== 1 },
                            { icon: Trash2, action: deleteItems, title: 'Delete', disabled: selectedItems.length === 0, color: 'text-red-600 hover:bg-red-100' },
                        ].map((btn, idx) => (
                            <button 
                                key={idx}
                                className={`p-2 rounded transition-colors disabled:opacity-30 ${btn.color || (theme.isDark ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600 hover:bg-white/60')}`}
                                disabled={btn.disabled} 
                                onClick={btn.action} 
                                title={btn.title}
                            >
                                {btn.icon ? <btn.icon size={18} className={btn.className}/> : (
                                    <div className={`border rounded px-1 text-[10px] font-bold h-[18px] w-[18px] flex items-center justify-center ${theme.isDark ? 'border-gray-400' : 'border-gray-500'}`}>{btn.label}</div>
                                )}
                            </button>
                        ))}
                    </>
                )}

                <div className="h-8 w-[1px] bg-gray-400/30 mx-2"></div>

                <button
                    className={`p-2 rounded transition-colors disabled:opacity-30 ${theme.isDark ? 'text-blue-300 hover:bg-blue-500/20' : 'text-blue-600 hover:bg-blue-100'}`}
                    disabled={selectedItems.length === 0}
                    onClick={handleDownload}
                    title="Download Selected"
                >
                    <Download size={18} />
                </button>


                <div className="flex-1"></div>

                <button className={`flex items-center space-x-1.5 px-3 py-1.5 rounded hover:bg-white/20 transition-colors ${theme.isDark ? 'text-gray-300' : 'text-gray-700'}`} onClick={() => setSortConfig(p => ({ ...p, direction: p.direction === 'asc' ? 'desc' : 'asc' }))}>
                    <div className="text-xs">Sort</div>
                </button>
                <button className={`flex items-center space-x-1.5 px-3 py-1.5 rounded hover:bg-white/20 transition-colors ${theme.isDark ? 'text-gray-300' : 'text-gray-700'}`} onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}>
                    {viewMode === 'grid' ? <LayoutGrid size={16} /> : <ListIcon size={16} />}
                    <div className="text-xs">View</div>
                </button>
            </div>

            {/* --- Address Bar --- */}
            <div className={`h-12 border-b flex items-center px-3 space-x-3 shrink-0 ${theme.isDark ? 'bg-gray-800/30 border-gray-700' : 'bg-[#f3f3f3]/50 border-gray-200'}`}>
                 <div className="flex space-x-1 text-gray-500">
                    <button className={`p-1.5 rounded-full hover:bg-white/20 transition-colors disabled:opacity-30`} onClick={handleBack} disabled={!activeTab.history || activeTab.currentIndex === undefined || activeTab.currentIndex <= 0}><ArrowLeft size={16} className={theme.isDark ? 'text-gray-300' : ''}/></button>
                    <button className="p-1.5 rounded-full hover:bg-white/20 transition-colors disabled:opacity-30" onClick={handleForward} disabled={!activeTab.history || activeTab.currentIndex === undefined || activeTab.currentIndex >= activeTab.history.length - 1}><ChevronRight size={16} className={theme.isDark ? 'text-gray-300' : ''}/></button>
                    <button className="p-1.5 rounded-full hover:bg-white/20 transition-colors" onClick={handleGoUp}><ArrowUp size={16} className={theme.isDark ? 'text-gray-300' : ''}/></button>
                 </div>

                 <div className={`flex-1 h-8 border rounded shadow-sm flex items-center px-3 text-xs transition-all cursor-text group ${theme.isDark ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700 text-gray-200' : 'bg-white/70 hover:bg-white border-transparent hover:border-gray-300 text-gray-800'}`}>
                    <Monitor size={14} className="opacity-50 mr-2"/>
                    <div className="flex items-center h-full flex-1 space-x-1 overflow-hidden">
                        <ChevronRight size={12} className="opacity-40 flex-shrink-0"/>
                        {getBreadcrumbs(fileSystem, currentPath).map((item, idx, arr) => (
                            <div key={item.id} className="flex items-center flex-shrink-0">
                                <span 
                                    className="px-2 py-0.5 hover:bg-black/5 dark:hover:bg-white/10 rounded cursor-pointer transition-colors border border-transparent hover:border-gray-300 dark:hover:border-gray-600" 
                                    onClick={() => handleNavigate(item.id)}
                                >
                                    {item.name}
                                </span>
                                {idx < arr.length - 1 && <ChevronRight size={10} className="opacity-40 mx-0.5"/>}
                            </div>
                        ))}
                    </div>
                 </div>
                 
                 <div className={`w-64 h-8 border rounded shadow-sm flex items-center px-3 text-xs transition-all ${theme.isDark ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700 text-gray-200' : 'bg-white/70 hover:bg-white border-transparent hover:border-gray-300 text-gray-800'}`}>
                    <Search size={14} className="opacity-50 mr-2"/>
                    <input 
                        type="text" 
                        placeholder={`Search ${currentFolder.name}`} 
                        className="bg-transparent w-full outline-none placeholder-gray-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                 </div>
            </div>

            {/* --- Main Content --- */}
            <div className={`flex-1 flex overflow-hidden relative ${theme.isDark ? 'bg-transparent' : 'bg-white/40'}`}>
                
                {/* Sidebar */}
                <div className={`w-64 flex-shrink-0 border-r py-4 overflow-y-auto hidden md:block custom-scrollbar relative z-10 ${theme.isDark ? 'border-gray-700 bg-gray-800/20' : 'border-gray-200 bg-[#f9f9f9]/30'}`}>
                     <div className="mb-6">
                        <div className="px-4 py-1.5 flex items-center opacity-60 mx-2 mb-1">
                            <Star size={14} className="mr-3"/>
                            <span className="text-xs font-bold uppercase tracking-wider">Quick access</span>
                        </div>
                        {SIDEBAR_ITEMS.map(item => {
                            const folder = fileSystem.find(f => f.id === item.id);
                            // If folder is deleted/missing, we skip rendering or could render disabled state.
                            // For system folders, we usually want them to persist, but let's check existence.
                            if (!folder) return null;
                            
                            return (
                                <div 
                                    key={item.id} 
                                    className={`px-6 py-2 flex items-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-sm mx-2 rounded transition-colors ${currentPath === folder.id ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : ''}`}
                                    onClick={() => handleNavigate(folder.id)}
                                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-blue-500/20'); }}
                                    onDragLeave={(e) => { e.currentTarget.classList.remove('bg-blue-500/20'); }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        e.currentTarget.classList.remove('bg-blue-500/20');
                                        handleDrop(e, folder.id);
                                    }}
                                >
                                    <FileIcon type="folder" customIcon={item.id} className="w-4 h-4 mr-3" />
                                    {folder.name}
                                </div>
                            );
                        })}
                     </div>
                     <div>
                        <div className="px-4 py-1.5 flex items-center opacity-60 mx-2 mb-1 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 rounded" onClick={() => handleNavigate('root')}>
                            <Monitor size={14} className="mr-3"/>
                            <span className="text-xs font-bold uppercase tracking-wider">This PC</span>
                        </div>
                         {fileSystem.filter(f => f.parentId === 'root').map(item => (
                             <div 
                                key={item.id} 
                                className={`px-8 py-2 flex items-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-sm mx-2 rounded transition-colors ${currentPath === item.id ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : ''}`}
                                onClick={() => handleNavigate(item.id)}
                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-blue-500/20'); }}
                                onDragLeave={(e) => { e.currentTarget.classList.remove('bg-blue-500/20'); }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.remove('bg-blue-500/20');
                                    handleDrop(e, item.id);
                                }}
                             >
                                <FileIcon type={item.type} customIcon={item.icon} className="w-4 h-4 mr-3" />
                                <span className="truncate">{item.name}</span>
                             </div>
                         ))}
                     </div>
                     
                     {/* Recycle Bin Sidebar Item */}
                     <div className="mt-4 border-t border-gray-300/30 pt-4">
                        <div 
                            className={`px-4 py-2 flex items-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-sm mx-2 rounded transition-colors ${currentPath === 'trash' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : ''}`}
                            onClick={() => handleNavigate('trash')}
                            onDrop={(e) => {
                                e.preventDefault();
                                const data = e.dataTransfer.getData('text/plain');
                                if (data) {
                                    const movedIds = JSON.parse(data) as string[];
                                    if(movedIds && movedIds.length > 0) {
                                        const updated = fileSystem.map(f => movedIds.includes(f.id) ? { ...f, isTrashed: true } : f);
                                        setFileSystem(updated);
                                        movedIds.forEach(id => {
                                            const item = updated.find(f => f.id === id);
                                            if(item) saveFileToDB(item).catch(console.error);
                                        });
                                    }
                                }
                            }}
                             onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-red-500/20'); }}
                             onDragLeave={(e) => { e.currentTarget.classList.remove('bg-red-500/20'); }}
                        >
                            <Trash2 size={16} className="mr-3 text-gray-500" />
                            Recycle Bin
                        </div>
                     </div>
                </div>

                {/* File View Area */}
                <div 
                    ref={filesViewRef}
                    className="flex-1 overflow-y-auto p-4 custom-scrollbar relative"
                    onMouseDown={handleSelectionStart}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => handleDrop(e, currentPath)}
                    onClick={() => setSelectedItems([])}
                >
                    {/* Marquee Box */}
                    {isSelecting && selectionBox && (
                        <div className="absolute bg-blue-500/20 border border-blue-500/60 z-50 pointer-events-none"
                             style={{
                                 left: Math.min(selectionBox.x1, selectionBox.x2) - (filesViewRef.current?.scrollLeft || 0),
                                 top: Math.min(selectionBox.y1, selectionBox.y2) - (filesViewRef.current?.scrollTop || 0),
                                 width: Math.abs(selectionBox.x1 - selectionBox.x2),
                                 height: Math.abs(selectionBox.y1 - selectionBox.y2),
                             }}
                        />
                    )}

                    {currentFiles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-40 pointer-events-none select-none">
                            <div className="w-24 h-24 bg-gray-500/10 rounded-full flex items-center justify-center mb-4">
                                {currentPath === 'trash' ? <Trash2 size={48} strokeWidth={1}/> : <Folder size={48} strokeWidth={1}/>}
                            </div>
                            <p className="font-medium text-lg">{currentPath === 'trash' ? 'Recycle Bin is empty' : 'This folder is empty.'}</p>
                        </div>
                    ) : (
                        <div className={`
                            ${viewMode === 'grid' 
                                ? 'grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2' 
                                : 'flex flex-col space-y-0.5'
                            }
                        `}>
                            {currentFiles.map(file => (
                                <div
                                    key={file.id}
                                    data-id={file.id}
                                    draggable
                                    tabIndex={0}
                                    onDragStart={(e) => {
                                        const dragIds = selectedItems.includes(file.id) ? selectedItems : [file.id];
                                        e.dataTransfer.setData('text/plain', JSON.stringify(dragIds));
                                        setDraggedItems(dragIds);
                                    }}
                                    onDragEnd={() => setDraggedItems([])}
                                    onDragOver={(e) => {
                                        if (file.type === 'folder' || file.type === 'drive') {
                                            e.preventDefault();
                                            e.stopPropagation();
                                        } else if (file.type === 'audio') {
                                            e.preventDefault();
                                            e.stopPropagation();
                                        }
                                    }}
                                    onDragEnter={(e) => {
                                        if (file.type === 'folder' || file.type === 'drive') {
                                            e.currentTarget.classList.add('bg-blue-500/20');
                                        } else if (file.type === 'audio') {
                                            e.currentTarget.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
                                        }
                                    }}
                                    onDragLeave={(e) => {
                                        if (file.type === 'folder' || file.type === 'drive') {
                                            e.currentTarget.classList.remove('bg-blue-500/20');
                                        } else if (file.type === 'audio') {
                                            e.currentTarget.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
                                        }
                                    }}
                                    onDrop={(e) => {
                                        if (file.type === 'audio' && e.dataTransfer.files.length > 0) {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            e.currentTarget.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
                                            
                                            const droppedFile = e.dataTransfer.files[0];
                                            if (droppedFile.type.startsWith('image/')) {
                                                const url = URL.createObjectURL(droppedFile);
                                                setFileSystem(prev => {
                                                    const updated = prev.map(f => f.id === file.id ? { ...f, cover: url } : f);
                                                    const item = updated.find(f => f.id === file.id);
                                                    if(item) saveFileToDB(item).catch(console.error);
                                                    return updated;
                                                });
                                            }
                                            return;
                                        }

                                        if (file.type === 'folder' || file.type === 'drive') {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            e.currentTarget.classList.remove('bg-blue-500/20');
                                            handleDrop(e, file.id);
                                        }
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (e.ctrlKey || e.metaKey) {
                                            setSelectedItems(prev => prev.includes(file.id) ? prev.filter(i => i !== file.id) : [...prev, file.id]);
                                        } else if (e.shiftKey && selectedItems.length > 0) {
                                            setSelectedItems([file.id]); 
                                        } else {
                                            setSelectedItems([file.id]);
                                        }
                                    }}
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenItem(file);
                                    }}
                                    className={`
                                        file-item group cursor-default relative rounded border border-transparent transition-all duration-100 outline-none focus:bg-blue-500/10
                                        ${selectedItems.includes(file.id) 
                                            ? 'bg-blue-500/20 border-blue-500/30 shadow-sm' 
                                            : 'hover:bg-black/5 dark:hover:bg-white/10 hover:border-black/5 dark:hover:border-white/5'}
                                        ${viewMode === 'grid' ? 'flex flex-col items-center p-3 h-[130px]' : 'flex items-center px-3 py-1.5'}
                                        ${draggedItems.includes(file.id) ? 'opacity-40' : 'opacity-100'}
                                    `}
                                >
                                    <div className={`pointer-events-none ${viewMode === 'grid' ? 'w-16 h-16 mb-3 flex items-center justify-center' : 'w-5 h-5 mr-3 flex-shrink-0'}`}>
                                        {file.type === 'drive' ? <DriveIconDetailed /> : 
                                         file.type === 'folder' ? <FolderIconDetailed /> : 
                                         (file.type === 'image' && file.src) ? (
                                            <div className="w-full h-full relative overflow-hidden rounded shadow-sm border border-gray-200 bg-white p-0.5">
                                                <img src={file.src} alt="" className="w-full h-full object-cover rounded-[2px]" />
                                            </div>
                                         ) :
                                         (file.type === 'audio') ? (
                                             <div className="w-full h-full relative overflow-hidden rounded shadow-sm border border-gray-200 bg-black p-0 group-hover:scale-105 transition-transform">
                                                 {file.cover ? (
                                                     <img src={file.cover} alt="" className="w-full h-full object-cover" />
                                                 ) : (
                                                     <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800">
                                                         <Music size={viewMode === 'grid' ? 24 : 12} className="text-gray-500" />
                                                     </div>
                                                 )}
                                                 <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                                     <div className="bg-white/90 rounded-full p-1"><Play size={10} fill="black" className="ml-0.5"/></div>
                                                 </div>
                                                 {!file.cover && viewMode === 'grid' && (
                                                     <div className="absolute bottom-0 w-full text-[8px] text-center text-gray-400 bg-black/50 py-0.5">Drop Cover</div>
                                                 )}
                                             </div>
                                         ) :
                                         <FileIcon type={file.type} customIcon={file.icon} className={viewMode === 'grid' ? "w-12 h-12" : "w-5 h-5"} />
                                        }
                                    </div>
                                    
                                    {isRenaming === file.id ? (
                                        <form onSubmit={handleRenameSubmit} className={viewMode === 'grid' ? 'w-full' : 'flex-1'} onClick={e => e.stopPropagation()}>
                                            <input 
                                                autoFocus
                                                type="text" 
                                                value={renameValue} 
                                                onChange={(e) => setRenameValue(e.target.value)}
                                                onBlur={handleRenameSubmit}
                                                className={`w-full text-center text-xs border border-blue-500 outline-none px-1 py-0.5 shadow-sm ${theme.isDark ? 'bg-gray-700 text-white' : 'bg-white text-black'}`}
                                            />
                                        </form>
                                    ) : (
                                        <div className={`pointer-events-none text-xs ${theme.isDark ? 'text-gray-300' : 'text-gray-700'} ${viewMode === 'grid' ? 'text-center w-full break-words line-clamp-2 leading-tight' : 'flex-1 truncate'}`}>
                                            {file.name}
                                        </div>
                                    )}
                                    
                                    {viewMode === 'list' && (
                                        <>
                                            <div className="pointer-events-none w-32 text-xs opacity-60 text-right">{file.date || '-'}</div>
                                            <div className="pointer-events-none w-24 text-xs opacity-60 text-right font-mono">{formatSize(file.size)}</div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* --- Media Preview Modal --- */}
        {previewItem && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-200" onClick={() => setPreviewItem(null)}>
                <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors" onClick={() => setPreviewItem(null)}>
                    <X size={24}/>
                </button>
                
                <div className="max-w-5xl max-h-full w-full h-full flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
                    {previewItem.type === 'image' && previewItem.src && (
                        <img src={previewItem.src} alt={previewItem.name} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                    )}
                    
                    {previewItem.type === 'video' && previewItem.src && (
                        <video src={previewItem.src} controls autoPlay className="max-w-full max-h-full rounded-lg shadow-2xl outline-none" />
                    )}
                    
                    {previewItem.type === 'audio' && (
                        <div className="bg-gray-900 rounded-xl p-8 flex flex-col items-center shadow-2xl border border-gray-700 min-w-[320px]">
                            <div className="relative group">
                                {previewItem.cover ? (
                                    <img src={previewItem.cover} alt="Album Art" className="w-64 h-64 object-cover rounded-lg mb-6 shadow-lg" />
                                ) : (
                                    <div className="w-64 h-64 bg-gray-800 rounded-lg mb-6 flex items-center justify-center shadow-inner">
                                        <Disc size={80} className="text-gray-600 animate-spin-slow" />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-sm"
                                        onClick={() => coverInputRef.current?.click()}
                                        title="Change Cover Art"
                                    >
                                        <Camera size={16} />
                                    </button>
                                </div>
                            </div>
                            <h2 className="text-white text-xl font-medium mb-2 text-center break-words max-w-[300px]">{previewItem.name}</h2>
                            <p className="text-gray-400 text-sm mb-6">Audio Preview</p>
                            <audio src={previewItem.src} controls className="w-full" autoPlay />
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* --- Delete Confirmation Modal --- */}
        {showDeleteConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowDeleteConfirm(false)}>
                <div 
                    className={`w-full max-w-sm p-6 rounded-xl shadow-2xl border scale-100 transform transition-all ${theme.isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                    onClick={e => e.stopPropagation()}
                >
                    <h3 className="text-lg font-semibold mb-2">
                         {trashAction === 'empty' ? 'Empty Recycle Bin?' : (currentPath === 'trash' ? 'Delete Permanently?' : 'Move to Recycle Bin?')}
                    </h3>
                    <p className={`text-sm mb-6 ${theme.isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {trashAction === 'empty' 
                            ? 'Are you sure you want to permanently delete all items in the Recycle Bin?' 
                            : (currentPath === 'trash' 
                                ? 'Are you sure you want to permanently delete these items? This action cannot be undone.' 
                                : 'These items will be moved to the Recycle Bin. You can restore them later.')}
                    </p>
                    <div className="flex justify-end space-x-3">
                        <button 
                            onClick={() => setShowDeleteConfirm(false)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${theme.isDark ? 'hover:bg-gray-700 bg-gray-700/50 text-gray-200' : 'hover:bg-gray-100 bg-gray-100 text-gray-700'}`}
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmDelete}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors"
                        >
                             {trashAction === 'empty' ? 'Empty Bin' : (currentPath === 'trash' ? 'Delete Forever' : 'Delete')}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* --- Change Password Modal --- */}
        {showChangePassModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowChangePassModal(false)}>
                <div 
                    className={`w-full max-w-sm p-6 rounded-xl shadow-2xl border scale-100 transform transition-all ${theme.isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                    onClick={e => e.stopPropagation()}
                >
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                        <Key size={18} className="mr-2 opacity-70"/> Change Code
                    </h3>
                    
                    <div className="space-y-3">
                         <div className="relative">
                            <input 
                                type={showPassReveals.current ? "text" : "password"}
                                placeholder="Current Code"
                                className={`w-full p-2 rounded border outline-none text-sm transition-colors ${theme.isDark ? 'bg-gray-900 border-gray-600 focus:border-blue-500' : 'bg-gray-50 border-gray-300 focus:border-blue-500'}`}
                                value={changePassData.current}
                                onChange={e => setChangePassData({...changePassData, current: e.target.value})}
                            />
                            <button type="button" onClick={() => setShowPassReveals(p => ({...p, current: !p.current}))} className="absolute right-2 top-2 opacity-50 hover:opacity-100">
                                {showPassReveals.current ? <EyeOff size={14}/> : <Eye size={14}/>}
                            </button>
                         </div>
                         <div className="relative">
                            <input 
                                type={showPassReveals.new ? "text" : "password"}
                                placeholder="New Code (min 4 chars)"
                                className={`w-full p-2 rounded border outline-none text-sm transition-colors ${theme.isDark ? 'bg-gray-900 border-gray-600 focus:border-blue-500' : 'bg-gray-50 border-gray-300 focus:border-blue-500'}`}
                                value={changePassData.new}
                                onChange={e => setChangePassData({...changePassData, new: e.target.value})}
                            />
                             <button type="button" onClick={() => setShowPassReveals(p => ({...p, new: !p.new}))} className="absolute right-2 top-2 opacity-50 hover:opacity-100">
                                {showPassReveals.new ? <EyeOff size={14}/> : <Eye size={14}/>}
                            </button>
                         </div>
                         <div className="relative">
                            <input 
                                type={showPassReveals.confirm ? "text" : "password"}
                                placeholder="Confirm New Code"
                                className={`w-full p-2 rounded border outline-none text-sm transition-colors ${theme.isDark ? 'bg-gray-900 border-gray-600 focus:border-blue-500' : 'bg-gray-50 border-gray-300 focus:border-blue-500'}`}
                                value={changePassData.confirm}
                                onChange={e => setChangePassData({...changePassData, confirm: e.target.value})}
                            />
                            <button type="button" onClick={() => setShowPassReveals(p => ({...p, confirm: !p.confirm}))} className="absolute right-2 top-2 opacity-50 hover:opacity-100">
                                {showPassReveals.confirm ? <EyeOff size={14}/> : <Eye size={14}/>}
                            </button>
                         </div>
                    </div>

                    {changePassError && <p className="text-red-500 text-xs mt-3">{changePassError}</p>}

                    <div className="flex justify-end space-x-3 mt-6">
                        <button 
                            onClick={() => setShowChangePassModal(false)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${theme.isDark ? 'hover:bg-gray-700 bg-gray-700/50 text-gray-200' : 'hover:bg-gray-100 bg-gray-100 text-gray-700'}`}
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={submitChangePassword}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
                        >
                             Save Changes
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}
