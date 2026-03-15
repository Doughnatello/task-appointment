"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase, type Profile } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { X, User, Camera, Save, Mail, Lock, Eye, EyeOff, Fingerprint, Shield, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  onUpdate: () => void;
}

export default function ProfileModal({ isOpen, onClose, profile, onUpdate }: ProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // States to toggle editability
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);

  useEffect(() => {
    if (profile) {
      setAvatarUrl(profile.avatar_url || '');
      setNewEmail(profile.email || '');
    }
    // Reset edit states when modal closes/opens
    setIsEditingEmail(false);
    setIsEditingPassword(false);
  }, [profile, isOpen]);

  const handleUpload = async (file: File) => {
    if (!profile) return null;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`; 

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          cacheControl: '3600'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error("Upload failed:", error);
      throw new Error(error.message || "Check storage permissions.");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setLoading(true);
    try {
      let finalAvatarUrl = avatarUrl;

      if (avatarFile) {
        const uploadedUrl = await handleUpload(avatarFile);
        if (uploadedUrl) {
          finalAvatarUrl = `${uploadedUrl}?t=${new Date().getTime()}`;
        }
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          avatar_url: finalAvatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);
      
      if (profileError) throw profileError;

      if (isEditingEmail && newEmail !== profile.email && newEmail.trim() !== "") {
        const { error: emailError } = await supabase.auth.updateUser({ email: newEmail });
        if (emailError) throw emailError;
        toast.success('Confirmation link sent to your new email!');
      }

      if (isEditingPassword && newPassword.trim() !== "") {
        if (newPassword.length < 6) throw new Error("Minimum 6 characters required.");
        const { error: pwdError } = await supabase.auth.updateUser({ password: newPassword });
        if (pwdError) throw pwdError;
        setNewPassword(''); 
        toast.success('Security key updated!');
      }

      toast.success('Operative profile synced');
      onUpdate(); 
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
      setAvatarFile(null);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("File exceeds 2MB limit.");
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => document.getElementById('avatar-upload')?.click();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-[#0a0a0b] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
          >
            <div className="p-8 max-h-[90vh] overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Profile</h2>
                </div>
                <button type="button" onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-6">
                <div className="flex flex-col items-center">
                  <div className="relative group">
                    <input type="file" id="avatar-upload" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                    <div 
                      onClick={triggerFileInput} 
                      className="w-28 h-28 rounded-full bg-slate-900 border-2 border-white/10 overflow-hidden flex items-center justify-center ring-4 ring-primary/10 cursor-pointer relative"
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-12 h-12 text-slate-700" />
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* --- READ ONLY SECTION --- */}
                  <div className="space-y-4 pb-4 border-b border-white/5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 px-1">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-5 top-4 w-4 h-4 text-slate-600" />
                        <div className="w-full bg-slate-900/30 border border-white/5 rounded-2xl pl-12 pr-5 py-3.5 text-slate-400 font-bold text-sm cursor-not-allowed">
                          {profile?.full_name || 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 px-1">Position</label>
                      <div className="relative">
                        <Shield className="absolute left-5 top-4 w-4 h-4 text-slate-600" />
                        <div className="w-full bg-slate-900/30 border border-white/5 rounded-2xl pl-12 pr-5 py-3.5 text-slate-400 font-bold text-sm cursor-not-allowed">
                          {profile?.position || (profile?.role === 'admin' ? 'Admin' : profile?.role === 'manager' ? 'Manager' : 'Operator')}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 px-1">EMPLOYEE ID</label>
                      <div className="relative">
                        <Fingerprint className="absolute left-5 top-4 w-4 h-4 text-slate-600" />
                        <div className="w-full bg-slate-900/30 border border-white/5 rounded-2xl pl-12 pr-5 py-3.5 text-slate-500 font-mono text-[10px] cursor-not-allowed">
                          {profile?.id}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* --- EDITABLE SECTION --- */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5 px-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Access Email</label>
                      <button 
                        type="button" 
                        onClick={() => setIsEditingEmail(!isEditingEmail)}
                        className={`text-[10px] font-bold flex items-center gap-1 transition-colors ${isEditingEmail ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        <Edit3 className="w-3 h-3" /> {isEditingEmail ? 'CANCEL' : 'RESET'}
                      </button>
                    </div>
                    <div className="relative">
                      <Mail className={`absolute left-5 top-4 w-4 h-4 ${isEditingEmail ? 'text-primary' : 'text-slate-600'}`} />
                      <input 
                        type="email" 
                        readOnly={!isEditingEmail}
                        value={newEmail} 
                        onChange={(e) => setNewEmail(e.target.value)} 
                        className={`w-full bg-slate-900/50 border border-white/10 rounded-2xl pl-12 pr-5 py-3.5 text-white focus:ring-2 focus:ring-primary/50 transition-all outline-none ${!isEditingEmail && 'opacity-60 cursor-not-allowed'}`} 
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5 px-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Security Key</label>
                      <button 
                        type="button" 
                        onClick={() => setIsEditingPassword(!isEditingPassword)}
                        className={`text-[10px] font-bold flex items-center gap-1 transition-colors ${isEditingPassword ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        <Edit3 className="w-3 h-3" /> {isEditingPassword ? 'CANCEL' : 'RESET'}
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className={`absolute left-5 top-4 w-4 h-4 ${isEditingPassword ? 'text-primary' : 'text-slate-600'}`} />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        readOnly={!isEditingPassword}
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        placeholder={isEditingPassword ? "Enter new security key..." : "••••••••••••"}
                        className={`w-full bg-slate-900/50 border border-white/10 rounded-2xl pl-12 pr-12 py-3.5 text-white focus:ring-2 focus:ring-primary/50 transition-all outline-none font-mono ${!isEditingPassword && 'opacity-60 cursor-not-allowed'}`} 
                      />
                      {isEditingPassword && (
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-4 text-slate-500 hover:text-white transition-colors">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    disabled={loading} 
                    className="w-full bg-primary hover:bg-primary/90 text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white" />
                    ) : (
                      <><Save className="w-5 h-5" /> SAVE CHANGES</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}