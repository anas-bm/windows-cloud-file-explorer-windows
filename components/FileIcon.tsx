import React from 'react';
import { 
  Monitor, 
  HardDrive, 
  FileText, 
  Image as ImageIcon, 
  Music, 
  Video, 
  Download, 
  LayoutGrid,
  FileCode,
  FileDigit,
  Disc
} from 'lucide-react';
import { FileType } from '../types';

interface FileIconProps {
  type: FileType;
  className?: string;
  customIcon?: string;
}

export const FileIcon: React.FC<FileIconProps> = ({ type, className = "w-6 h-6", customIcon }) => {
  // Handle specific named icons (like sidebar shortcuts)
  if (customIcon) {
    switch (customIcon) {
      case 'desktop': return <Monitor className={`${className} text-blue-500`} />;
      case 'documents': return <FileText className={`${className} text-yellow-600`} />;
      case 'downloads': return <Download className={`${className} text-green-600`} />;
      case 'pictures': return <ImageIcon className={`${className} text-purple-600`} />;
      case 'music': return <Music className={`${className} text-pink-500`} />;
      case 'videos': return <Video className={`${className} text-orange-500`} />;
      case 'drive': return <HardDrive className={`${className} text-gray-500`} />;
      default: break;
    }
  }

  // Handle generic types
  switch (type) {
    case 'drive': return <HardDrive className={`${className} text-gray-500`} />;
    case 'folder': return (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M20 6H12L10 4H4C2.89543 4 2 4.89543 2 6V18C2 19.1046 2.89543 20 4 20H20C21.1046 20 22 19.1046 22 18V8C22 6.89543 21.1046 6 20 6Z" fill="#FCD34D" stroke="#D97706" strokeWidth="1"/>
        <path d="M20 8H4V18H20V8Z" fill="#FDE68A" />
      </svg>
    );
    case 'image': return <ImageIcon className={`${className} text-blue-400`} />;
    case 'pdf': return <FileText className={`${className} text-red-500`} />;
    case 'excel': return <FileText className={`${className} text-green-600`} />;
    case 'word': return <FileText className={`${className} text-blue-600`} />;
    case 'video': return <Video className={`${className} text-purple-500`} />;
    case 'audio': return <Music className={`${className} text-pink-500`} />;
    case 'app': return <LayoutGrid className={`${className} text-cyan-600`} />;
    case 'file': return <FileText className={`${className} text-gray-400`} />;
    default: return <FileText className={`${className} text-gray-400`} />;
  }
};

export const FolderIconDetailed = () => (
   <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
      <path d="M5 25 Q5 20 10 20 H35 L45 30 H90 Q95 30 95 35 V85 Q95 90 90 90 H10 Q5 90 5 85 Z" fill="#E6C200" stroke="#CCA300" strokeWidth="1" />
      <path d="M5 40 H95 V85 Q95 90 90 90 H10 Q5 90 5 85 Z" fill="#FFD966" stroke="#E6C200" strokeWidth="1" />
      <path d="M15 40 V35 H85 V40" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.5"/>
   </svg>
);

export const DriveIconDetailed = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
    <rect x="10" y="35" width="80" height="30" rx="4" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="2" />
    <path d="M15 45 H25" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round"/>
    <rect x="70" y="42" width="10" height="16" rx="1" fill="#3B82F6" opacity="0.8"/>
    <path d="M30 80 H70" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
