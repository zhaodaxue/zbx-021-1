import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { api } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { SnowGun, SensorRecord, ShutdownRecord, FROST_LEVEL_COLORS, FROST_LEVEL_LABELS, GUN_STATUS_LABELS } from '../../shared/types.js';
import { formatDateTime, formatDuration, getRelativeTime } from '../utils/format';
import { ArrowLeft, Gauge, ThermometerSnowflake, Clock, AlertTriangle, CheckCircle, PlayCircle, MapPin, X, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function GunDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getGunById,
    loading: storeLoading,
    slopeGroups,
    newAlerts,
    dismissedDetailGunIds,
    dismissDetailAlert,
    defrostTodos,
  } = useAppStore();
  const [gun, setGun] = useState<SnowGun | null | undefined>(undefined);
  const [sensorRecords, setSensorRecords] = useState<SensorRecord[]>([]);
  const [shutdownRecords, setShutdownRecords] = useState<ShutdownRecord[]>([]);
  const [minPressure, setMinPressure] = useState(0);
  const [hours, setHours] = useState(2);

  useEffect(() => {
    if (!id) {
      setGun(null);
      return;
    }

    const gunFromStore = getGunById(id);
    if (gunFromStore) {
      setGun(gunFromStore);
      return;
    }

    if (storeLoading) return;

    let cancelled = false;
    api.getGunById(id)
      .then(response => {
        if (!cancelled) setGun(response.data);
      })
      .catch(() => {
        if (!cancelled) setGun(null);
      });

    return () => {
      cancelled = true;
    };
  }, [id, getGunById, storeLoading, slopeGroups]);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const [sensorRes, shutdownRes] = await Promise.all([
          api.getSensorRecords(id, hours),
          api.getShutdownRecords(id),
        ]);
        setSensorRecords(sensorRes.data);
        setMinPressure(sensorRes.minPressure);
        setShutdownRecords(shutdownRes.data);
      } catch (error) {
        console.error('Failed to fetch gun details:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [id, hours]);

  if (gun === undefined || storeLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!gun) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 mb-4">造雪枪不存在</p>
        <Link to="/" className="text-blue-500 hover:underline">返回看板</Link>
      </div>
    );
  }

  const chartData = {
    labels: sensorRecords.map(r => formatDateTime(r.recordedAt).split(' ')[1]),
    datasets: [
      {
        label: '管线水压 (巴)',
        data: sensorRecords.map(r => r.waterPressure),
        borderColor: '#165DFF',
        backgroundColor: 'rgba(22, 93, 255, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: '#165DFF',
      },
      {
        label: `最低工作水压 (${minPressure} 巴)`,
        data: sensorRecords.map(() => minPressure),
        borderColor: '#F53F3F',
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 10,
        },
      },
    },
  };

  const isDefrostRequired = gun.status === 'defrost_required';
  const isDefrostCompleted = gun.status === 'defrost_completed';

  const handleGoBack = () => navigate(-1);

  const currentGunAlert = newAlerts.find(a => a.gunId === id);
  const currentGunTodo = defrostTodos.find(t => t.id === id);
  const showDetailAlert = isDefrostRequired && currentGunAlert && !dismissedDetailGunIds.has(id || '');

  const handleDismissAlert = () => {
    if (id) {
      dismissDetailAlert(id);
    }
  };

  const handleGoToTodo = () => {
    navigate('/todo');
  };

  return (
    <div>
      <button
        onClick={handleGoBack}
        className="flex items-center gap-2 text-slate-500 hover:text-blue-500 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回
      </button>

      {showDetailAlert && currentGunAlert && (
        <div className="mb-6 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl p-5 shadow-lg shadow-red-200 animate-pulse-slow">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">该枪刚进入需融霜状态</h3>
                <p className="text-red-100 text-sm mb-2">
                  <span className="font-medium">触发原因：</span>
                  {currentGunAlert.triggerReason || currentGunTodo?.triggerReason || '未知原因'}
                </p>
                <p className="text-red-200 text-xs">
                  触发时间：{formatDateTime(currentGunAlert.shutdownAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleGoToTodo}
                className="px-4 py-2 bg-white text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" />
                跳转待办
              </button>
              <button
                onClick={handleDismissAlert}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                title="稍后处理"
              >
                <X className="w-4 h-4" />
                稍后处理
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={cn(
        'bg-white rounded-2xl border-2 p-6 mb-6',
        isDefrostRequired ? 'border-red-400' : isDefrostCompleted ? 'border-amber-400' : 'border-slate-200'
      )}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-slate-800">{gun.id}</h1>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                isDefrostRequired
                  ? 'bg-red-500 text-white'
                  : isDefrostCompleted
                  ? 'bg-amber-500 text-white'
                  : 'bg-green-500 text-white'
              }`}>
                {GUN_STATUS_LABELS[gun.status]}
              </span>
            </div>
            <div className="flex items-center gap-4 text-slate-500">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {gun.slope}
              </span>
              <span className="flex items-center gap-1">
                <Gauge className="w-4 h-4" />
                最低水压 {gun.minWaterPressure} 巴
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <Gauge className="w-5 h-5 mx-auto text-slate-400 mb-1" />
              <div className={cn(
                'text-2xl font-bold font-mono',
                gun.currentWaterPressure !== undefined && gun.currentWaterPressure < gun.minWaterPressure
                  ? 'text-red-600'
                  : 'text-slate-800'
              )}>
                {gun.currentWaterPressure?.toFixed(1) ?? '--'}
              </div>
              <div className="text-xs text-slate-500">当前水压 (巴)</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <ThermometerSnowflake className="w-5 h-5 mx-auto text-slate-400 mb-1" />
              <div className="flex items-center justify-center gap-2">
                <div
                  className="w-6 h-6 rounded-full"
                  style={{
                    backgroundColor: gun.currentFrostLevel !== undefined
                      ? FROST_LEVEL_COLORS[gun.currentFrostLevel]
                      : '#CBD5E1',
                  }}
                />
                <span className="text-2xl font-bold text-slate-800">
                  {gun.currentFrostLevel ?? '--'}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {gun.currentFrostLevel !== undefined
                  ? FROST_LEVEL_LABELS[gun.currentFrostLevel]
                  : '结霜等级'}
              </div>
            </div>
          </div>
        </div>

        {gun.currentRecordedAt && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <Clock className="w-4 h-4" />
              最后更新: {formatDateTime(gun.currentRecordedAt)}
              <span className="text-slate-400">({getRelativeTime(gun.currentRecordedAt)})</span>
            </div>
            <div className="flex gap-2">
              {isDefrostRequired && (
                <Link
                  to="/todo"
                  className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  处理融霜
                </Link>
              )}
              {isDefrostCompleted && (
                <Link
                  to="/recovery"
                  className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2"
                >
                  <PlayCircle className="w-4 h-4" />
                  恢复运行
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">水压趋势</h2>
            <div className="flex gap-2">
              {[1, 2, 6, 24].map(h => (
                <button
                  key={h}
                  onClick={() => setHours(h)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    hours === h
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>
          <div className="h-80">
            {sensorRecords.length > 0 ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                暂无水压数据
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">结霜等级历史</h2>
            <div className="space-y-2 max-h-80 overflow-auto">
              {sensorRecords.slice(-20).reverse().map((record, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50"
                >
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: FROST_LEVEL_COLORS[record.frostLevel] }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-700">
                      {FROST_LEVEL_LABELS[record.frostLevel]} (等级 {record.frostLevel})
                    </div>
                    <div className="text-xs text-slate-400">
                      {formatDateTime(record.recordedAt)}
                    </div>
                  </div>
                </div>
              ))}
              {sensorRecords.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  暂无结霜数据
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">停机记录</h2>
            <div className="space-y-3 max-h-60 overflow-auto">
              {shutdownRecords.map(record => (
                <div
                  key={record.id}
                  className="p-3 bg-slate-50 rounded-xl"
                >
                  <div className="flex items-center gap-2 mb-1">
                    {record.recoveredAt ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : record.defrostConfirmedAt ? (
                      <CheckCircle className="w-4 h-4 text-amber-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm font-medium text-slate-700">
                      {record.recoveredAt ? '已恢复' : record.defrostConfirmedAt ? '融霜完成' : '需融霜'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <div>停机: {formatDateTime(record.shutdownAt)}</div>
                    {record.defrostConfirmedAt && (
                      <div>融霜确认: {formatDateTime(record.defrostConfirmedAt)}</div>
                    )}
                    {record.recoveredAt && (
                      <div>恢复: {formatDateTime(record.recoveredAt)}</div>
                    )}
                    {record.defrostConfirmedAt && (
                      <div>
                        持续: {formatDuration(record.shutdownAt, record.recoveredAt)}
                      </div>
                    )}
                    {record.triggerReason && (
                      <div className="text-slate-400 mt-1 pt-1 border-t border-slate-200">
                        {record.triggerReason}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {shutdownRecords.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  暂无停机记录
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
