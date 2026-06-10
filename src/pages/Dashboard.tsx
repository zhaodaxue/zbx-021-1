import { useAppStore } from '../store/useAppStore';
import GunCard from '../components/GunCard';
import { Snowflake, AlertTriangle, CheckCircle, Activity } from 'lucide-react';

export default function Dashboard() {
  const { slopeGroups, defrostTodos, recoveryTodos, loading } = useAppStore();

  const totalGuns = slopeGroups.reduce((sum, g) => sum + g.guns.length, 0);
  const normalGuns = slopeGroups.reduce(
    (sum, g) => sum + g.guns.filter(gun => gun.status === 'normal').length,
    0
  );

  if (loading && slopeGroups.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">坡道看板</h1>
        <p className="text-slate-500">实时监控所有造雪枪运行状态</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{totalGuns}</p>
              <p className="text-sm text-slate-500">造雪枪总数</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Snowflake className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{normalGuns}</p>
              <p className="text-sm text-slate-500">正常运行</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-red-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{defrostTodos.length}</p>
              <p className="text-sm text-slate-500">需融霜</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-amber-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{recoveryTodos.length}</p>
              <p className="text-sm text-slate-500">待恢复</p>
            </div>
          </div>
        </div>
      </div>

      {slopeGroups.map(group => (
        <div key={group.slope} className="mb-10 last:mb-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1.5 h-8 bg-gradient-to-b from-blue-500 to-cyan-400 rounded-full" />
            <h2 className="text-xl font-bold text-slate-800">{group.slope}</h2>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
              {group.guns.length} 把枪
            </span>
            {group.guns.some(g => g.status === 'defrost_required') && (
              <span className="px-2.5 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                有需融霜
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {group.guns.map(gun => (
              <GunCard key={gun.id} gun={gun} />
            ))}
          </div>
        </div>
      ))}

      {slopeGroups.length === 0 && !loading && (
        <div className="text-center py-16 text-slate-500">
          <Snowflake className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p className="text-lg">暂无造雪枪数据</p>
          <p className="text-sm mt-2">请先运行数据初始化脚本</p>
        </div>
      )}
    </div>
  );
}
