import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { FROST_LEVEL_COLORS, FROST_LEVEL_LABELS } from '../../shared/types.js';
import { formatDateTime, formatDuration, getRelativeTime } from '../utils/format';
import { PlayCircle, Clock, Gauge, ThermometerSnowflake, CheckCircle, AlertTriangle, Eye, AlertCircle } from 'lucide-react';

export default function RecoveryTodo() {
  const { recoveryTodos, confirmRecovery, loading } = useAppStore();
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const handleConfirm = async (shutdownId: number, currentFrostLevel: number) => {
    let message = '确认恢复造雪枪运行？';
    if (currentFrostLevel >= 2) {
      message = `警告：当前结霜等级为 ${currentFrostLevel}，仍需确认恢复运行？`;
    }

    if (!window.confirm(message)) return;

    setConfirmingId(shutdownId);
    try {
      const result = await confirmRecovery(shutdownId);
      let alertMessage = result.message;
      if (result.warning) {
        alertMessage += '\n\n' + result.warning;
      }
      alert(alertMessage);
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setConfirmingId(null);
    }
  };

  if (loading && recoveryTodos.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <PlayCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">恢复运行登记</h1>
            <p className="text-slate-500">为已完成融霜的造雪枪登记恢复</p>
          </div>
        </div>
      </div>

      {recoveryTodos.length > 0 ? (
        <div className="grid gap-4">
          {recoveryTodos.map(todo => {
            const highFrostWarning = (todo.currentFrostLevel ?? 0) >= 2;

            return (
              <div
                key={todo.shutdownId}
                className={`bg-white rounded-2xl border-2 p-6 ${
                  highFrostWarning
                    ? 'border-orange-300 shadow-lg shadow-orange-50'
                    : 'border-amber-200 shadow-lg shadow-amber-50'
                }`}
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
                      <span className="px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        融霜完成待恢复
                      </span>
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                        {todo.slope}
                      </span>
                      {highFrostWarning && (
                        <span className="px-3 py-1 bg-orange-100 text-orange-600 text-xs font-bold rounded-full flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          结霜等级偏高
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-5 gap-4 mb-4">
                      <div className="bg-slate-50 rounded-xl p-3">
                        <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                          <Gauge className="w-3.5 h-3.5" />
                          当前水压
                        </div>
                        <div className="text-xl font-bold font-mono text-slate-800">
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
                            className={`w-5 h-5 rounded-full ${highFrostWarning ? 'animate-pulse' : ''}`}
                            style={{
                              backgroundColor: todo.currentFrostLevel !== undefined
                                ? FROST_LEVEL_COLORS[todo.currentFrostLevel]
                                : '#CBD5E1',
                            }}
                          />
                          <span className={`text-xl font-bold ${highFrostWarning ? 'text-orange-600' : 'text-slate-800'}`}>
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
                          停机时间
                        </div>
                        <div className="text-sm font-medium text-slate-800">
                          {formatDateTime(todo.shutdownAt)}
                        </div>
                        <div className="text-xs text-slate-400">
                          {getRelativeTime(todo.shutdownAt)}
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3">
                        <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          融霜确认
                        </div>
                        <div className="text-sm font-medium text-green-600">
                          {formatDateTime(todo.defrostConfirmedAt)}
                        </div>
                        <div className="text-xs text-slate-400">
                          {getRelativeTime(todo.defrostConfirmedAt)}
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3">
                        <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                          <Clock className="w-3.5 h-3.5" />
                          已停机
                        </div>
                        <div className="text-xl font-bold text-slate-800">
                          {formatDuration(todo.shutdownAt)}
                        </div>
                      </div>
                    </div>

                    {highFrostWarning && (
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-orange-700">结霜等级偏高警告</p>
                          <p className="text-xs text-orange-600 mt-0.5">
                            当前结霜等级为 {todo.currentFrostLevel}，建议确认融霜效果后再恢复运行
                          </p>
                        </div>
                      </div>
                    )}
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
                      onClick={() => handleConfirm(todo.shutdownId, todo.currentFrostLevel ?? 0)}
                      disabled={confirmingId === todo.shutdownId}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {confirmingId === todo.shutdownId ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          登记中...
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-4 h-4" />
                          登记恢复运行
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">一切正常</h3>
          <p className="text-slate-500">当前没有待恢复的造雪枪</p>
        </div>
      )}
    </div>
  );
}
