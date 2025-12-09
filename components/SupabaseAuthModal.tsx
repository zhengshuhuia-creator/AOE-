
import React, { useState, useEffect } from 'react';
import { Database, LogIn, Key, Link as LinkIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getSupabaseCreds, initSupabase, getSupabase, clearSupabaseCreds } from '../supabaseClient';

interface SupabaseAuthModalProps {
  onLoginSuccess: () => void;
  onLogout: () => void;
  userEmail: string | null;
}

export const SupabaseAuthModal: React.FC<SupabaseAuthModalProps> = ({ onLoginSuccess, onLogout, userEmail }) => {
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

  const handleClearConfig = () => {
    clearSupabaseCreds();
    setStep('config');
    setUrl('');
    setKey('');
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
        setMessage('注册确认邮件已发送！请查收邮件点击链接登录。');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onLoginSuccess();
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
      <div className="space-y-6 text-center">
         <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-lg">
            <CheckCircle2 size={40} />
         </div>
         <h3 className="text-xl font-bold text-gray-800">已连接云端</h3>
         <p className="text-gray-500 font-medium">当前账号: {userEmail}</p>
         
         <div className="bg-blue-50 p-4 rounded-xl text-left text-sm text-blue-800 border border-blue-100">
           <p>✨ 你的数据正在通过 Supabase 实时同步。</p>
         </div>

         <button
           onClick={() => {
             if(confirm('确定要退出登录吗？本地数据将不再同步。')) {
               onLogout();
             }
           }}
           className="w-full py-3 bg-red-50 text-red-500 font-bold rounded-xl hover:bg-red-100 transition-colors"
         >
           退出登录
         </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Steps Indicator */}
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
