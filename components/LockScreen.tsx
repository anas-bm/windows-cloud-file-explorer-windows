
import React, { useState, useEffect } from 'react';
import { ArrowRight, User, Loader2, Eye, EyeOff } from 'lucide-react';
import { UserAccount } from '../types';

interface LockScreenProps {
  onLogin: (user: UserAccount) => void;
  existingUser: UserAccount | null;
  bgImage?: string;
}

const LockScreen: React.FC<LockScreenProps> = ({ onLogin, existingUser, bgImage }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showLogin, setShowLogin] = useState(false);
  
  // Form State
  const [handle, setHandle] = useState(existingUser?.handle || '@');
  const [displayName, setDisplayName] = useState(existingUser?.displayName || '');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(!existingUser);
  const [isLoading, setIsLoading] = useState(false);

  // Sync isCreating if existingUser prop changes (e.g. invalid user cleared by parent)
  useEffect(() => {
      setIsCreating(!existingUser);
      if(!existingUser) {
          setHandle('@');
          setDisplayName('');
      } else {
          setHandle(existingUser.handle);
          setDisplayName(existingUser.displayName);
      }
  }, [existingUser]);

  // Default Windows 11 Bloom if no bg provided
  const background = bgImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop';

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleInteraction = () => {
    if (!showLogin) setShowLogin(true);
  };

  const handleHandleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (!val.startsWith('@')) val = '@' + val.replace(/@/g, '');
    setHandle(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      if (isCreating) {
        if (handle.length < 3) {
          setError('Handle must be at least 2 characters after @');
          setIsLoading(false);
          return;
        }
        if (!displayName.trim()) {
           setError('Display Name is required');
           setIsLoading(false);
           return;
        }
        if (pin.length < 4) {
          setError('Code must be at least 4 characters.');
          setIsLoading(false);
          return;
        }
        const newUser: UserAccount = { handle, displayName, pin };
        localStorage.setItem('win11_user', JSON.stringify(newUser));
        onLogin(newUser);
      } else {
        if (existingUser && pin === existingUser.pin && handle === existingUser.handle) {
          onLogin(existingUser);
        } else {
          setError('Incorrect handle or code. Please try again.');
          setIsLoading(false);
        }
      }
    }, 800);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).replace(/^0/, '');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-cover bg-center flex flex-col items-center justify-center transition-all duration-700 overflow-hidden"
      style={{ 
        backgroundImage: `url('${background}')`,
      }}
      onClick={handleInteraction}
    >
      {/* Time & Date Widget (Fade out on click) */}
      <div 
        className={`flex flex-col items-center text-white drop-shadow-lg transition-all duration-500 transform ${showLogin ? '-translate-y-48 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}
      >
        <div className="text-8xl font-light tracking-tighter mb-2">
          {formatTime(currentTime)}
        </div>
        <div className="text-2xl font-medium">
          {formatDate(currentTime)}
        </div>
      </div>

      {/* Login / Signup Form (Fade in on click) */}
      <div 
        className={`absolute inset-0 bg-black/20 backdrop-blur-md flex flex-col items-center justify-center transition-all duration-500 ${showLogin ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
      >
        <div className="flex flex-col items-center w-full max-w-xs animate-in fade-in zoom-in-95 duration-500">
            {/* Avatar */}
            <div className="w-32 h-32 bg-gray-200/20 rounded-full flex items-center justify-center mb-4 shadow-2xl border border-white/10 overflow-hidden">
                {existingUser?.avatar ? (
                    <img src={existingUser.avatar} alt="User" className="w-full h-full object-cover" />
                ) : (
                    <User size={64} className="text-white/80" />
                )}
            </div>

            {/* User Name */}
            <div className="text-2xl text-white font-semibold mb-1">
                {isCreating ? 'Create Account' : existingUser?.displayName}
            </div>
            {!isCreating && <div className="text-white/70 text-sm mb-6">{existingUser?.handle}</div>}
            {isCreating && <div className="text-white/70 text-sm mb-6">Set up your device</div>}

            <form onSubmit={handleSubmit} className="w-full flex flex-col space-y-3" onClick={e => e.stopPropagation()}>
                {isCreating && (
                    <>
                     <input 
                        type="text" 
                        placeholder="Display Name" 
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full bg-black/30 border-2 border-transparent focus:border-white/50 focus:bg-black/50 text-white placeholder-gray-300 rounded px-4 py-2 outline-none transition-all"
                        required
                    />
                    <input 
                        type="text" 
                        placeholder="Handle (@username)" 
                        value={handle}
                        onChange={handleHandleChange}
                        className="w-full bg-black/30 border-2 border-transparent focus:border-white/50 focus:bg-black/50 text-white placeholder-gray-300 rounded px-4 py-2 outline-none transition-all"
                        required
                    />
                    </>
                )}
                
                {!isCreating && existingUser && isCreating === false && (
                    <input 
                        type="text" 
                        placeholder="Enter your @handle" 
                        value={handle}
                        onChange={handleHandleChange}
                        className="w-full bg-black/30 border-2 border-transparent focus:border-white/50 focus:bg-black/50 text-white placeholder-gray-300 rounded px-4 py-2 outline-none transition-all"
                    />
                )}

                <div className="relative w-full">
                    <input 
                        type={showPin ? "text" : "password"}
                        placeholder="Code" 
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        className="w-full bg-black/30 border-2 border-transparent focus:border-white/50 focus:bg-black/50 text-white placeholder-gray-300 rounded px-4 py-2 outline-none transition-all pr-16"
                        autoFocus={!isCreating}
                    />
                    <div className="absolute right-1 top-1 bottom-1 flex items-center space-x-1">
                        <button
                            type="button"
                            onClick={() => setShowPin(!showPin)}
                            className="p-1.5 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
                        >
                            {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="p-1.5 bg-white/10 hover:bg-white/30 rounded flex items-center justify-center transition-colors disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 size={16} className="animate-spin text-white"/> : <ArrowRight size={16} className="text-white"/>}
                        </button>
                    </div>
                </div>
                
                {error && <p className="text-red-300 text-xs text-center bg-red-500/20 py-1 rounded">{error}</p>}
                
                <div 
                    className="text-white/80 text-sm text-center hover:text-white hover:underline cursor-pointer mt-6 transition-all"
                    onClick={(e) => {
                        e.stopPropagation();
                        if(existingUser) {
                           setIsCreating(!isCreating);
                           setError('');
                           setPin('');
                        }
                    }}
                >
                    {isCreating && existingUser ? "← Back to Sign In" : (existingUser ? "Switch to new account" : "")}
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default LockScreen;
