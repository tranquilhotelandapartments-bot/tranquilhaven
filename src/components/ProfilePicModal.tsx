/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Camera, Upload, X, Check, Globe } from 'lucide-react';

const PRESET_AVATARS = [
  {
    id: 'director',
    label: 'Executive Director',
    url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&h=150&q=80',
  },
  {
    id: 'concierge',
    label: 'Guest Relations',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80',
  },
  {
    id: 'housekeeping',
    label: 'Housekeeping Supervisor',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&h=150&q=80',
  },
  {
    id: 'reception',
    label: 'Front Desk Host',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80',
  },
  {
    id: 'security',
    label: 'Security Chief',
    url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=150&h=150&q=80',
  },
  {
    id: 'guest',
    label: 'Resort Guest',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
  },
];

interface ProfilePicModalProps {
  currentUrl?: string;
  onClose: () => void;
  onSave: (url: string) => Promise<void>;
}

export default function ProfilePicModal({ currentUrl, onClose, onSave }: ProfilePicModalProps) {
  const [selectedUrl, setSelectedUrl] = useState<string>(currentUrl || '');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload an image file (PNG, JPG, WEBP).');
      return;
    }
    // Limit to 4MB for safe base64 storage
    if (file.size > 4 * 1024 * 1024) {
      setErrorMsg('File size is too large. Please select an image under 4MB.');
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === 'string') {
        setSelectedUrl(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleApplyCustomUrl = () => {
    if (!customUrl.trim()) return;
    if (!customUrl.startsWith('http://') && !customUrl.startsWith('https://')) {
      setErrorMsg('Please enter a valid HTTP or HTTPS image link.');
      return;
    }
    setSelectedUrl(customUrl.trim());
    setErrorMsg(null);
  };

  const handleSave = async () => {
    if (!selectedUrl) {
      setErrorMsg('Please select or upload a profile picture.');
      return;
    }
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await onSave(selectedUrl);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update profile picture. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-neutral-200 text-neutral-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden font-sans flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#a89078]/10 text-[#a89078] rounded-lg">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-display font-black text-black uppercase tracking-wider">
                Profile Avatar Settings
              </h2>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                Customize your professional security/concierge avatar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all cursor-pointer border-none bg-transparent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-mono leading-relaxed">
              {errorMsg}
            </div>
          )}

          {/* Current Selection Preview */}
          <div className="flex flex-col items-center justify-center py-2 bg-[#fbf9f6] border border-[#f0e6da] rounded-2xl space-y-2">
            <div className="relative">
              <img
                src={selectedUrl || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&h=120&q=80"}
                alt="Selected avatar preview"
                className="w-20 h-20 rounded-full object-cover ring-4 ring-[#a89078]/20 border border-neutral-300 shadow-sm"
              />
              <div className="absolute -bottom-1 -right-1 bg-black text-white p-1 rounded-full text-[9px] font-mono leading-none border border-neutral-200 uppercase tracking-widest">
                PREVIEW
              </div>
            </div>
            <p className="text-[10px] font-mono text-zinc-500">
              Active Selection Preview
            </p>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-[#a89078]">
              Upload Custom Image File
            </label>
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                dragActive 
                  ? 'border-[#a89078] bg-[#a89078]/5' 
                  : 'border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
              <Upload className="w-5 h-5 text-neutral-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-neutral-700">
                Drag and drop your profile image here
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">
                Or click to select a file from your device (Max 4MB)
              </p>
            </div>
          </div>

          {/* Custom URL Field */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-[#a89078]">
              Or paste image web address
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="https://example.com/your-avatar.jpg"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="w-full bg-zinc-50 border border-neutral-200 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#a89078] focus:bg-white text-neutral-800 transition-all font-mono"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyCustomUrl}
                className="bg-[#a89078]/10 text-[#a89078] hover:bg-[#a89078]/20 font-bold uppercase text-[10px] px-4 rounded-xl cursor-pointer transition-all border-none"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Professional presets */}
          <div className="space-y-2.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-[#a89078]">
              Or choose a curated professional preset
            </label>
            <div className="grid grid-cols-3 gap-3">
              {PRESET_AVATARS.map((avatar) => {
                const isSelected = selectedUrl === avatar.url;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => {
                      setSelectedUrl(avatar.url);
                      setErrorMsg(null);
                    }}
                    className={`relative p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                      isSelected 
                        ? 'border-[#a89078] bg-[#a89078]/5 ring-1 ring-[#a89078]' 
                        : 'border-neutral-200 hover:border-neutral-400 bg-white'
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={avatar.url}
                        alt={avatar.label}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 bg-[#a89078] text-white p-0.5 rounded-full border border-white">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] font-bold text-neutral-600 line-clamp-1 block leading-tight">
                      {avatar.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-neutral-100 text-neutral-600 border border-neutral-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="px-5 py-2 bg-[#a89078] hover:bg-[#917962] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 border-none"
          >
            {isSaving ? 'Saving...' : 'Save Avatar'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
