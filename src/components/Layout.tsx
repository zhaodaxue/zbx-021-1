import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Snowflake, AlertTriangle, PlayCircle, RefreshCw } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useEffect } from 'react';
import { formatTime } from '../utils/format';

const navItems = [
  { path: '/', label: '坡道看板', icon: LayoutDashboard },
  { path: '/todo', label: '需融霜待办', icon: AlertTriangle },
  { path: '/recovery', label: '恢复运行', icon: PlayCircle },
];

export default function Layout() {
  const location = useLocation();
  const { fetchAllData, loading, error, lastUpdate, defrostTodos, recoveryTodos } = useAppStore();

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-lg">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <Snowflake className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">造雪联调系统</h1>
              <p className="text-xs text-slate-500">管线水压 · 结霜监控</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const badgeCount = item.path === '/todo' ? defrostTodos.length : 
                              item.path === '/recovery' ? recoveryTodos.length : 0;
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-medium shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'text-blue-500' : 'group-hover:scale-110'}`} />
                <span className="flex-1">{item.label}</span>
                {badgeCount > 0 && (
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                    item.path === '/todo' 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'bg-amber-500 text-white'
                  }`}>
                    {badgeCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button
            onClick={() => fetchAllData()}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? '刷新中...' : '刷新数据'}
          </button>
          {lastUpdate > 0 && (
            <p className="text-xs text-slate-400 text-center mt-2">
              最后更新: {formatTime(new Date(lastUpdate).toISOString())}
            </p>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              ⚠️ {error}
            </div>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
