
import { FileSystemItem } from '../types';

const DB_NAME = 'Win11ExplorerDB';
const STORE_NAME = 'fileSystem';
const DB_VERSION = 1;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(new Error(`Failed to open database: ${request.error?.message}`));
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const saveFileToDB = async (file: FileSystemItem): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // Clone to avoid mutating the original state object during serialization if needed
      // IndexedDB can store File objects (Blobs) natively.
      // We do NOT save the 'src' blob URL because it expires. We regenerate it on load.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { src, ...itemToSave } = file; 
      
      const request = store.put(itemToSave);

      request.onsuccess = () => resolve();
      request.onerror = () => {
          console.error("DB Put Error:", request.error);
          reject(request.error);
      };
      
      transaction.onabort = () => {
          const err = transaction.error || new Error('Transaction aborted');
          console.error("DB Transaction Aborted:", err);
          reject(err);
      };
      transaction.onerror = () => {
          console.error("DB Transaction Error:", transaction.error);
          reject(transaction.error);
      };
    });
  } catch (error) {
      console.error("saveFileToDB wrapper error:", error);
      throw error;
  }
};

export const saveAllToDB = async (files: FileSystemItem[]): Promise<void> => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            files.forEach(file => {
                 // eslint-disable-next-line @typescript-eslint/no-unused-vars
                 const { src, ...itemToSave } = file;
                 store.put(itemToSave);
            });
            
            transaction.oncomplete = () => resolve();
            transaction.onabort = () => reject(transaction.error || new Error('Transaction aborted in saveAllToDB'));
            transaction.onerror = () => reject(transaction.error);
        });
    } catch (error) {
        console.error("saveAllToDB wrapper error:", error);
        throw error;
    }
};

export const deleteFileFromDB = async (id: string): Promise<void> => {
  try {
      const db = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        transaction.onabort = () => reject(transaction.error || new Error('Transaction aborted in deleteFileFromDB'));
      });
  } catch (error) {
      console.error("deleteFileFromDB wrapper error:", error);
      throw error;
  }
};

export const loadFileSystemFromDB = async (): Promise<FileSystemItem[]> => {
  try {
      const db = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const items = request.result as FileSystemItem[];
          // Regenerate Blob URLs for content
          const hydratedItems = items.map(item => {
              if (item.content && typeof item.content !== 'string' && item.content instanceof Blob) {
                  return { ...item, src: URL.createObjectURL(item.content) };
              }
              return item;
          });
          resolve(hydratedItems);
        };
        request.onerror = () => reject(request.error);
      });
  } catch (error) {
      console.error("loadFileSystemFromDB wrapper error:", error);
      throw error;
  }
};
