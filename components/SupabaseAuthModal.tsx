import React, { useState, useEffect } from 'react';
import { Database, LogIn, Key, Link as LinkIcon, AlertCircle, CheckCircle2, Download, Upload, Cloud, RefreshCw } from 'lucide-react';
import { getSupabaseCreds, initSupabase, getSupabase, clearSupabaseCreds } from '../supabaseClient';

interface SupabaseAuthModalProps {
  onLoginSuccess: () => void;
  onLogout: () => void;
  userEmail: string | null;
  onExport: () => void;
  onImport: () => void;
}

export const SupabaseAuthModal: React.FC<SupabaseAuthModalProps> = ({ 
  onLoginSuccess, 
  onLogout, 
  userEmail,
  onExport,
  onImport
}) => {
  const [step, setStep] = useState<'config' | 'auth'>(() => getSupabaseCreds() ? 'auth' : 'config');
  
  // Config State
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  
  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const creds = getSupabaseCreds();
    if (creds) {
      setUrl(creds.url);
      setKey(creds.key);
    }
  }, []);

  const handleSaveConfig = () => {
    if (!url || !key) {
      setError('请输入完整的 URL 和 Key');
      return;
    }
    try {
      initSupabase(url, key);
      setStep('auth');
      setError('');
    } catch (e) {
      setError('配置无效，请检查 URL 格式');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const supabase = getSupabase();
    if (!supabase) {
      setError('Supabase 客户端未初始化，请重新配置');
      setStep('config');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('✅ 注册确认邮件已发送！请查收邮件点击链接登录。');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        setMessage('✅ 登录成功！正在跳转...');
        setTimeout(() => {
           onLoginSuccess();
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || '认证失败，请检查账号密码');
    } finally {
      setLoading(false);
    }
  };

  // Logged In View
  if (userEmail) {
    return (
      <div className="space-y-6">
         {/* Status Header */}
         <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <div className="w-16 h-16 bg-white text-green-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                <Cloud size={32} strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-black text-gray-800 tracking-tight">已连接 Supabase 云端</h3>
            <p className="text-gray-500 font-medium text-sm mt-1">{userEmail}</p>
            <div className="flex items-center justify-center gap-2 mt-4 text-xs font-bold text-green-700 bg-green-100/50 py-1.5 px-3 rounded-full inline-flex">
                <RefreshCw size={12} className="animate-spin" />
                实时同步中
            </div>
         </div>

         {/* Data Management Section */}
         <div className="space-y-3">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider pl-1">数据迁移 Migration</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {/* Backup Button */}
               <button 
                 onClick={onExport}
                 className="flex flex-col items-start p-4 bg-white border-2 border-gray-100 rounded-2xl hover:border-blue-200 hover:bg-blue-50 transition-all group active:scale-95"
               >
                  <div className="bg-blue-100 text-blue-600 p-2 rounded-lg mb-2 group-hover:bg-blue-200 transition-colors">
                      <Download size={20} />
                  </div>
                  <span className="font-bold text-gray-700">备份云端数据</span>
                  <span className="text-xs text-gray-400 mt-1 text-left">下载 JSON 备份到本地设备</span>
               </button>

               {/* Import Button */}
               <button 
                 onClick={onImport}
                 className="flex flex-col items-start p-4 bg-white border-2 border-purple-100 rounded-2xl hover:border-purple-300 hover:bg-purple-50 transition-all group active:scale-95 relative overflow-hidden"
               >
                  <div className="absolute top-0 right-0 bg-purple-100 text-purple-600 text-[10px] font-bold px-2 py-1 rounded-bl-xl">
                      Upload
                  </div>
                  <div className="bg-purple-100 text-purple-600 p-2 rounded-lg mb-2 group-hover:bg-purple-200 transition-colors">
                      <Upload size={20} />
                  </div>
                  <span className="font-bold text-gray-700">恢复数据到云端</span>
                  <span className="text-xs text-gray-400 mt-1 text-left">上传 JSON 并覆盖云端记录</span>
               </button>
            </div>
         </div>

         {/* Logout */}
         <div className="pt-4 border-t border-gray-100">
             <button
               onClick={() => {
                 if(confirm('确定要退出登录吗？本地数据将不再同步。')) {
                   onLogout();
                 }
               }}
               className="w-full py-3 text-red-400 font-bold text-sm hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors"
             >
               退出登录 (Sign Out)
             </button>
         </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className={`h-2 flex-1 rounded-full ${step === 'config' ? 'bg-blue-500' : 'bg-green-500'}`} />
        <div className={`h-2 flex-1 rounded-full ${step === 'auth' ? 'bg-blue-500' : 'bg-gray-200'}`} />
      </div>

      {step === 'config' ? (
        <div className="space-y-4 animate-[slideUp_0.3s_ease-out]">
          <div className="text-center mb-4">
             <Database size={48} className="mx-auto text-blue-400 mb-2" />
             <h3 className="text-lg font-bold text-gray-700">配置数据库</h3>
             <p className="text-xs text-gray-400 mt-1">请输入 Supabase 项目的 API URL 和 Anon Key</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Project URL</label>
            <div className="relative">
              <LinkIcon size={16} className="absolute left-3 top-3 text-gray-400" />
              <input 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-400 outline-none font-medium text-sm"
                placeholder="https://xyz.supabase.co"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Anon Key</label>
            <div className="relative">
              <Key size={16} className="absolute left-3 top-3 text-gray-400" />
              <input 
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-400 outline-none font-medium text-sm"
                placeholder="eyJhbGciOiJIUzI1NiIsInR..."
              />
            </div>
          </div>
          
          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-2 rounded-lg">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <button 
            onClick={handleSaveConfig}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95 transition-all"
          >
            下一步：登录
          </button>
        </div>
      ) : (
        <form onSubmit={handleAuth} className="space-y-4 animate-[slideUp_0.3s_ease-out]">
           <div className="text-center mb-4 relative">
             <button type="button" onClick={() => setStep('config')} className="absolute left-0 top-1 text-xs text-gray-400 hover:text-gray-600 underline">修改配置</button>
             <LogIn size={48} className="mx-auto text-blue-400 mb-2" />
             <h3 className="text-lg font-bold text-gray-700">{isSignUp ? '注册账号' : '登录账号'}</h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
            <input 
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-400 outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
            <input 
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-400 outline-none font-medium"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-2 rounded-lg">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          
          {message && (
            <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-2 rounded-lg">
              <CheckCircle2 size={16} /> {message}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />}
            {isSignUp ? '注册' : '登录并同步'}
          </button>

          <div className="text-center text-sm">
            <button 
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}
              className="text-blue-500 font-bold hover:underline"
            >
              {isSignUp ? '已有账号？去登录' : '没有账号？去注册'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
