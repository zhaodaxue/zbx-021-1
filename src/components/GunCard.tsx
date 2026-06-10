import { Link } from 'react-router-dom';
import { SnowGun, GUN_STATUS_LABELS, FROST_LEVEL_COLORS, FROST_LEVEL_LABELS } from '../../shared/types.js';
import { getRelativeTime } from '../utils/format';
import { Gauge, ThermometerSnowflake, Clock, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface GunCardProps {
  gun: SnowGun;
}

export default function GunCard({ gun }: GunCardProps) {
  const isDefrostRequired = gun.status === 'defrost_required';
  const isDefrostCompleted = gun.status === 'defrost_completed';
  const isLowPressure = gun.currentWaterPressure !== undefined && gun.currentWaterPressure < gun.minWaterPressure;

  const statusColor = isDefrostRequired
    ? 'bg-red-500 text-white'
    : isDefrostCompleted
    ? 'bg-amber-500 text-white'
    : 'bg-green-500 text-white';

  return (
    <Link
      to={`/gun/${gun.id}`}
      className={cn(
        'block relative bg-white rounded-2xl border-2 p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1',
        isDefrostRequired
          ? 'border-red-400 shadow-lg shadow-red-100 animate-pulse-slow'
          : isDefrostCompleted
          ? 'border-amber-400 shadow-lg shadow-amber-100'
          : 'border-slate-200 hover:border-blue-300'
      )}
    >
      {isDefrostRequired && (
        <div className="absolute -top-2 -right-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg">
            <AlertTriangle className="w-3 h-3" />
            需融霜
          </span>
        </div>
      )}
      {isDefrostCompleted && (
        <div className="absolute -top-2 -right-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full shadow-lg">
            <CheckCircle className="w-3 h-3" />
            待恢复
          </span>
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800">{gun.id}</h3>
          <p className="text-sm text-slate-500">{gun.slope}</p>
        </div>
        <span className={`px-2.5 py-1 text-xs font-medium rounded-md ${statusColor}`}>
          {GUN_STATUS_LABELS[gun.status]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-50 rounded-xl p-3">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <Gauge className="w-3.5 h-3.5" />
            管线水压
          </div>
          <div className="flex items-baseline gap-1">
            <span className={cn(
              'text-xl font-bold font-mono',
              isLowPressure ? 'text-red-600' : 'text-slate-800'
            )}>
              {gun.currentWaterPressure?.toFixed(1) ?? '--'}
            </span>
            <span className="text-xs text-slate-500">巴</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            最低 {gun.minWaterPressure} 巴
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-3">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <ThermometerSnowflake className="w-3.5 h-3.5" />
            结霜等级
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full"
              style={{
                backgroundColor: gun.currentFrostLevel !== undefined
                  ? FROST_LEVEL_COLORS[gun.currentFrostLevel]
                  : '#CBD5E1',
              }}
            />
            <div>
              <div className="text-lg font-bold text-slate-800">
                {gun.currentFrostLevel ?? '--'}
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {gun.currentFrostLevel !== undefined
              ? FROST_LEVEL_LABELS[gun.currentFrostLevel]
              : '暂无数据'}
          </div>
        </div>
      </div>

      {gun.currentRecordedAt && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            {getRelativeTime(gun.currentRecordedAt)}
          </div>
          <div className="flex items-center gap-1 text-blue-500 text-xs font-medium">
            查看详情
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      )}
    </Link>
  );
}
