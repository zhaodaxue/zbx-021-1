import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronUp, ChevronDown, Check, CheckCheck, Clock, MapPin } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { formatTime } from '../utils/format';

export default function AlertBar() {
  const navigate = useNavigate();
  const {
    newAlerts,
    alertsCollapsed,
    setAlertsCollapsed,
    acknowledgeAlert,
    acknowledgeAllAlerts,
    setHighlightedGun,
  } = useAppStore();

  const alertCount = newAlerts.length;

  if (alertCount === 0) {
    return null;
  }

  const handleAlertClick = (gunId: string) => {
    setHighlightedGun(gunId);
    navigate('/');
  };

  const handleAcknowledge = (e: React.MouseEvent, shutdownId: number) => {
    e.stopPropagation();
    acknowledgeAlert(shutdownId);
  };

  const handleAcknowledgeAll = () => {
    acknowledgeAllAlerts();
  };

  const toggleCollapsed = () => {
    setAlertsCollapsed(!alertsCollapsed);
  };

  return (
    <div className="bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg">
      <div
        className="flex items-center justify-between px-6 py-3 cursor-pointer select-none"
        onClick={toggleCollapsed}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <AlertTriangle className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-red-600 text-xs font-bold rounded-full flex items-center justify-center">
              {alertCount}
            </span>
          </div>
          <div>
            <span className="font-semibold">新增需融霜提醒</span>
            <span className="ml-2 text-red-100 text-sm">
              {alertCount} 把造雪枪进入需融霜状态
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!alertsCollapsed && alertCount > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAcknowledgeAll();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              全部已知悉
            </button>
          )}
          {alertsCollapsed ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronUp className="w-5 h-5" />
          )}
        </div>
      </div>

      {!alertsCollapsed && (
        <div className="bg-red-600/50 border-t border-red-400/30 px-6 py-3">
          <div className="flex flex-wrap gap-3">
            {newAlerts.map((alert) => (
              <div
                key={alert.shutdownId}
                className="flex items-center gap-4 bg-white/10 hover:bg-white/20 rounded-xl px-4 py-3 cursor-pointer transition-colors group"
                onClick={() => handleAlertClick(alert.gunId)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-lg">{alert.gunId}</span>
                    <span className="flex items-center gap-1 text-red-100 text-xs">
                      <MapPin className="w-3 h-3" />
                      {alert.slope}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-red-100">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(alert.shutdownAt)}
                    </span>
                    <span className="truncate max-w-48">{alert.triggerReason}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => handleAcknowledge(e, alert.shutdownId)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors opacity-0 group-hover:opacity-100"
                  title="已知悉"
                >
                  <Check className="w-3.5 h-3.5" />
                  已知悉
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
