import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { FROST_LEVEL_COLORS, FROST_LEVEL_LABELS } from '../../shared/types.js';
import { formatDateTime, formatDuration, getRelativeTime } from '../utils/format';
import { AlertTriangle, Clock, Gauge, ThermometerSnowflake, CheckCircle, Snowflake, Eye } from 'lucide-react';

export default function DefrostTodo() {
  const { defrostTodos, confirmDefrost, loading } = useAppStore();
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const handleConfirm = async (shutdownId: number) => {
    if (!window.confirm('确认已完成融霜作业？')) return;

    setConfirmingId(shutdownId);
    try {
      const result = await confirmDefrost(shutdownId);
      alert(result.message);
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setConfirmingId(null);
    }
  };

  if (loading && defrostTodos.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">需融霜待办</h1>
            <p className="text-slate-500">处理结霜严重的造雪枪</p>
          </div>
        </div>
      </div>

      {defrostTodos.length > 0 ? (
        <div className="grid gap-4">
          {defrostTodos.map(todo => (
            <div
              key={todo.shutdownId}
              className="bg-white rounded-2xl border-2 border-red-200 p-6 shadow-lg shadow-red-50"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Link
                      to={`/gun/${todo.id}`}
                      className="text-2xl font-bold text-slate-800 hover:text-blue-500 transition-colors"
                    >
                      {todo.id}
                    </Link>
                    <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      需融霜
                    </span>
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                      {todo.slope}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="bg-slate-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                        <Gauge className="w-3.5 h-3.5" />
                        当前水压
                      </div>
                      <div className="text-xl font-bold font-mono text-red-600">
                        {todo.currentWaterPressure?.toFixed(1) ?? '--'}
                        <span className="text-xs text-slate-400 ml-1">巴</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        最低 {todo.minWaterPressure} 巴
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                        <ThermometerSnowflake className="w-3.5 h-3.5" />
                        结霜等级
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-full"
                          style={{
                            backgroundColor: todo.currentFrostLevel !== undefined
                              ? FROST_LEVEL_COLORS[todo.currentFrostLevel]
                              : '#CBD5E1',
                          }}
                        />
                        <span className="text-xl font-bold text-slate-800">
                          {todo.currentFrostLevel ?? '--'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {todo.currentFrostLevel !== undefined
                          ? FROST_LEVEL_LABELS[todo.currentFrostLevel]
                          : '暂无数据'}
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                        <Clock className="w-3.5 h-3.5" />
                        触发时间
                      </div>
                      <div className="text-sm font-medium text-slate-800">
                        {formatDateTime(todo.shutdownAt)}
                      </div>
                      <div className="text-xs text-red-500 font-medium">
                        {getRelativeTime(todo.shutdownAt)}
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                        <Clock className="w-3.5 h-3.5" />
                        已持续
                      </div>
                      <div className="text-xl font-bold text-slate-800">
                        {formatDuration(todo.shutdownAt)}
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                    <p className="text-sm text-red-700">
                      <span className="font-medium">触发原因：</span>
                      {todo.triggerReason}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 ml-6">
                  <Link
                    to={`/gun/${todo.id}`}
                    className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    查看详情
                  </Link>
                  <button
                    onClick={() => handleConfirm(todo.shutdownId)}
                    disabled={confirmingId === todo.shutdownId}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-medium rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg shadow-green-200 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {confirmingId === todo.shutdownId ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        确认中...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        融霜完成确认
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Snowflake className="w-10 h-10 text-green-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">太棒了！</h3>
          <p className="text-slate-500">当前没有需要融霜的造雪枪</p>
        </div>
      )}
    </div>
  );
}
