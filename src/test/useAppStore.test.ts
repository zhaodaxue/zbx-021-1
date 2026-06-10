import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAppStore } from '../store/useAppStore';
import { api } from '../api/client';
import {
  makeGun,
  makeDefrostTodo,
  makeRecoveryTodo,
  gunsResponse,
  defrostResponse,
  recoveryResponse,
} from './helpers';

vi.mock('../api/client', () => ({
  api: {
    getAllGuns: vi.fn(),
    getDefrostTodos: vi.fn(),
    getRecoveryTodos: vi.fn(),
    confirmDefrost: vi.fn(),
    confirmRecovery: vi.fn(),
    reportSensorData: vi.fn(),
    getGunById: vi.fn(),
    getSensorRecords: vi.fn(),
    getShutdownRecords: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

function resetStore() {
  useAppStore.setState({
    slopeGroups: [],
    defrostTodos: [],
    recoveryTodos: [],
    loading: false,
    error: null,
    lastUpdate: 0,
    newAlerts: [],
    acknowledgedShutdownIds: new Set(),
    alertsCollapsed: false,
    highlightedGunId: null,
    dismissedDetailGunIds: new Set(),
    prevStatusMap: new Map(),
    prevFetchSuccess: false,
  });
}

beforeEach(() => {
  resetStore();
  vi.clearAllMocks();
  window.localStorage.clear();
  vi.mocked(window.localStorage.getItem).mockClear();
  vi.mocked(window.localStorage.setItem).mockClear();
});

describe('useAppStore - defrost alert state transformation', () => {
  describe('first load does not produce alerts', () => {
    it('first fetchAllData does not add to newAlerts even if guns are defrost_required', async () => {
      const gun1 = makeGun({ id: 'G1', status: 'defrost_required' });
      const todo1 = makeDefrostTodo({ id: 'G1', shutdownId: 100 });

      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([todo1]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().fetchAllData();

      expect(useAppStore.getState().newAlerts).toEqual([]);
      expect(useAppStore.getState().prevFetchSuccess).toBe(true);
      expect(useAppStore.getState().prevStatusMap.size).toBe(1);
    });
  });

  describe('polling: transition from non-defrost_required to defrost_required', () => {
    it('writes to newAlerts when gun transitions normal → defrost_required', async () => {
      const gun1Normal = makeGun({ id: 'G1', status: 'normal' });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1Normal]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().fetchAllData();
      expect(useAppStore.getState().newAlerts).toEqual([]);

      const gun1Defrost = makeGun({ id: 'G1', status: 'defrost_required' });
      const todo1 = makeDefrostTodo({ id: 'G1', shutdownId: 100 });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1Defrost]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([todo1]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().fetchAllData();

      const alerts = useAppStore.getState().newAlerts;
      expect(alerts).toHaveLength(1);
      expect(alerts[0].gunId).toBe('G1');
      expect(alerts[0].shutdownId).toBe(100);
    });

    it('does NOT write to newAlerts if shutdownId is already acknowledged', async () => {
      const gun1Normal = makeGun({ id: 'G1', status: 'normal' });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1Normal]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().fetchAllData();

      useAppStore.setState({ acknowledgedShutdownIds: new Set([100]) });

      const gun1Defrost = makeGun({ id: 'G1', status: 'defrost_required' });
      const todo1 = makeDefrostTodo({ id: 'G1', shutdownId: 100 });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1Defrost]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([todo1]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().fetchAllData();

      expect(useAppStore.getState().newAlerts).toEqual([]);
    });

    it('does NOT alert when gun stays defrost_required across polls', async () => {
      const gun1Defrost = makeGun({ id: 'G1', status: 'defrost_required' });
      const todo1 = makeDefrostTodo({ id: 'G1', shutdownId: 100 });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1Defrost]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([todo1]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().fetchAllData();
      expect(useAppStore.getState().newAlerts).toEqual([]);

      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1Defrost]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([todo1]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().fetchAllData();
      expect(useAppStore.getState().newAlerts).toEqual([]);
    });

    it('does NOT alert when gun transitions from defrost_completed to defrost_required (if already defrost_required in prev)', async () => {
      const gun1Defrost = makeGun({ id: 'G1', status: 'defrost_required' });
      const todo1 = makeDefrostTodo({ id: 'G1', shutdownId: 100 });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1Defrost]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([todo1]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().fetchAllData();

      const gun1Completed = makeGun({ id: 'G1', status: 'defrost_completed' });
      const recoveryTodo = makeRecoveryTodo({ id: 'G1', shutdownId: 100 });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1Completed]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([recoveryTodo]));

      await useAppStore.getState().fetchAllData();

      const gun1DefrostAgain = makeGun({ id: 'G1', status: 'defrost_required' });
      const todo1New = makeDefrostTodo({ id: 'G1', shutdownId: 200 });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1DefrostAgain]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([todo1New]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().fetchAllData();

      const alerts = useAppStore.getState().newAlerts;
      expect(alerts).toHaveLength(1);
      expect(alerts[0].shutdownId).toBe(200);
    });
  });

  describe('acknowledgeAlert / acknowledgeAllAlerts', () => {
    it('acknowledgeAlert removes the specific alert and persists shutdownId', async () => {
      const gun1Normal = makeGun({ id: 'G1', status: 'normal' });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1Normal]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().fetchAllData();

      const gun1Defrost = makeGun({ id: 'G1', status: 'defrost_required' });
      const todo1 = makeDefrostTodo({ id: 'G1', shutdownId: 100 });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1Defrost]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([todo1]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().fetchAllData();
      expect(useAppStore.getState().newAlerts).toHaveLength(1);

      useAppStore.getState().acknowledgeAlert(100);

      expect(useAppStore.getState().newAlerts).toEqual([]);
      expect(useAppStore.getState().acknowledgedShutdownIds.has(100)).toBe(true);
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'defrost_alerts_acknowledged',
        JSON.stringify([100])
      );
    });

    it('acknowledgeAllAlerts clears all alerts and persists all shutdownIds', async () => {
      const gun1Normal = makeGun({ id: 'G1', status: 'normal' });
      const gun2Normal = makeGun({ id: 'G2', status: 'normal' });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1Normal, gun2Normal]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().fetchAllData();

      const gun1Defrost = makeGun({ id: 'G1', status: 'defrost_required' });
      const gun2Defrost = makeGun({ id: 'G2', status: 'defrost_required' });
      const todo1 = makeDefrostTodo({ id: 'G1', shutdownId: 100 });
      const todo2 = makeDefrostTodo({ id: 'G2', shutdownId: 200 });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1Defrost, gun2Defrost]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([todo1, todo2]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().fetchAllData();
      expect(useAppStore.getState().newAlerts).toHaveLength(2);

      useAppStore.getState().acknowledgeAllAlerts();

      expect(useAppStore.getState().newAlerts).toEqual([]);
      expect(useAppStore.getState().acknowledgedShutdownIds.has(100)).toBe(true);
      expect(useAppStore.getState().acknowledgedShutdownIds.has(200)).toBe(true);
    });

    it('acknowledged shutdownId survives refresh - same shutdown does not re-alert', async () => {
      const gun1Normal = makeGun({ id: 'G1', status: 'normal' });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1Normal]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().fetchAllData();

      const gun1Defrost = makeGun({ id: 'G1', status: 'defrost_required' });
      const todo1 = makeDefrostTodo({ id: 'G1', shutdownId: 100 });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1Defrost]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([todo1]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().fetchAllData();
      useAppStore.getState().acknowledgeAlert(100);

      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1Defrost]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([todo1]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().fetchAllData();

      expect(useAppStore.getState().newAlerts).toEqual([]);
    });
  });

  describe('confirmDefrost / confirmRecovery clears related alerts', () => {
    it('confirmDefrost removes alert for the confirmed shutdownId', async () => {
      const gun1Normal = makeGun({ id: 'G1', status: 'normal' });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1Normal]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().fetchAllData();

      const gun1Defrost = makeGun({ id: 'G1', status: 'defrost_required' });
      const todo1 = makeDefrostTodo({ id: 'G1', shutdownId: 100 });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1Defrost]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([todo1]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().fetchAllData();
      expect(useAppStore.getState().newAlerts).toHaveLength(1);

      const gun1Completed = makeGun({ id: 'G1', status: 'defrost_completed' });
      mockedApi.confirmDefrost.mockResolvedValue({ success: true, message: 'ok' });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1Completed]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().confirmDefrost(100);

      expect(useAppStore.getState().newAlerts).toEqual([]);
      expect(useAppStore.getState().acknowledgedShutdownIds.has(100)).toBe(false);
    });

    it('confirmRecovery removes alert for the recovered shutdownId', async () => {
      const gun1Normal = makeGun({ id: 'G1', status: 'normal' });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1Normal]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().fetchAllData();

      const gun1Defrost = makeGun({ id: 'G1', status: 'defrost_required' });
      const todo1 = makeDefrostTodo({ id: 'G1', shutdownId: 100 });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1Defrost]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([todo1]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().fetchAllData();

      useAppStore.setState({
        newAlerts: [{ gunId: 'G1', slope: 'A坡', shutdownId: 100, shutdownAt: new Date().toISOString(), triggerReason: 'test' }],
      });

      const gun1NormalAgain = makeGun({ id: 'G1', status: 'normal' });
      const recoveryTodo = makeRecoveryTodo({ id: 'G1', shutdownId: 100 });
      mockedApi.confirmRecovery.mockResolvedValue({ success: true, message: 'ok' });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1NormalAgain]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([recoveryTodo]));

      await useAppStore.getState().confirmRecovery(100);

      expect(useAppStore.getState().newAlerts).toEqual([]);
    });

    it('confirmDefrost also clears highlight if it matches the gun', async () => {
      useAppStore.setState({
        highlightedGunId: 'G1',
        defrostTodos: [makeDefrostTodo({ id: 'G1', shutdownId: 100 })],
        newAlerts: [{ gunId: 'G1', slope: 'A坡', shutdownId: 100, shutdownAt: new Date().toISOString(), triggerReason: 'test' }],
      });

      const gun1Completed = makeGun({ id: 'G1', status: 'defrost_completed' });
      mockedApi.confirmDefrost.mockResolvedValue({ success: true, message: 'ok' });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1Completed]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().confirmDefrost(100);

      expect(useAppStore.getState().highlightedGunId).toBeNull();
    });
  });

  describe('highlightedGunId auto-clear when gun leaves defrost_required', () => {
    it('highlight is cleared when highlighted gun leaves defrost_required on next poll', async () => {
      useAppStore.setState({
        highlightedGunId: 'G1',
        prevFetchSuccess: true,
        prevStatusMap: new Map([['G1', 'defrost_required']]),
        slopeGroups: [{ slope: 'A坡', guns: [makeGun({ id: 'G1', status: 'defrost_required' })] }],
      });

      const gun1Normal = makeGun({ id: 'G1', status: 'normal' });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1Normal]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().fetchAllData();

      expect(useAppStore.getState().highlightedGunId).toBeNull();
    });
  });

  describe('dismissedDetailGunIds auto-clean', () => {
    it('dismissed record is cleaned when gun leaves defrost_required', async () => {
      useAppStore.setState({
        dismissedDetailGunIds: new Set(['G1']),
        prevFetchSuccess: true,
        prevStatusMap: new Map([['G1', 'defrost_required']]),
        slopeGroups: [{ slope: 'A坡', guns: [makeGun({ id: 'G1', status: 'defrost_required' })] }],
      });

      const gun1Normal = makeGun({ id: 'G1', status: 'normal' });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1Normal]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().fetchAllData();

      expect(useAppStore.getState().dismissedDetailGunIds.has('G1')).toBe(false);
    });
  });

  describe('acknowledgedShutdownIds auto-clean', () => {
    it('acknowledged shutdownId is cleaned when corresponding defrost todo no longer exists', async () => {
      useAppStore.setState({
        acknowledgedShutdownIds: new Set([100, 999]),
        prevFetchSuccess: true,
        prevStatusMap: new Map([['G1', 'defrost_required']]),
        slopeGroups: [{ slope: 'A坡', guns: [makeGun({ id: 'G1', status: 'defrost_required' })] }],
      });

      const gun1Completed = makeGun({ id: 'G1', status: 'defrost_completed' });
      const todo1 = makeDefrostTodo({ id: 'G1', shutdownId: 100 });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1Completed]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([todo1]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().fetchAllData();

      expect(useAppStore.getState().acknowledgedShutdownIds.has(999)).toBe(false);
      expect(useAppStore.getState().acknowledgedShutdownIds.has(100)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('same poll: multiple guns simultaneously transition to defrost_required', async () => {
      const gun1Normal = makeGun({ id: 'G1', status: 'normal' });
      const gun2Normal = makeGun({ id: 'G2', status: 'normal' });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1Normal, gun2Normal]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().fetchAllData();

      const gun1Defrost = makeGun({ id: 'G1', status: 'defrost_required' });
      const gun2Defrost = makeGun({ id: 'G2', status: 'defrost_required' });
      const todo1 = makeDefrostTodo({ id: 'G1', shutdownId: 100 });
      const todo2 = makeDefrostTodo({ id: 'G2', shutdownId: 200 });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1Defrost, gun2Defrost]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([todo1, todo2]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().fetchAllData();

      const alerts = useAppStore.getState().newAlerts;
      expect(alerts).toHaveLength(2);
      expect(alerts.map(a => a.gunId).sort()).toEqual(['G1', 'G2']);
    });

    it('after defrost complete and new shutdown, a new alert is triggered', async () => {
      const gun1Normal = makeGun({ id: 'G1', status: 'normal' });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1Normal]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().fetchAllData();

      const gun1Defrost = makeGun({ id: 'G1', status: 'defrost_required' });
      const todo1 = makeDefrostTodo({ id: 'G1', shutdownId: 100 });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1Defrost]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([todo1]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().fetchAllData();
      expect(useAppStore.getState().newAlerts).toHaveLength(1);

      useAppStore.getState().acknowledgeAlert(100);

      const gun1Completed = makeGun({ id: 'G1', status: 'defrost_completed' });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1Completed]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().fetchAllData();

      const gun1NormalAgain = makeGun({ id: 'G1', status: 'normal' });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1NormalAgain]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().fetchAllData();

      const gun1DefrostAgain = makeGun({ id: 'G1', status: 'defrost_required' });
      const todo2 = makeDefrostTodo({ id: 'G1', shutdownId: 300 });
      mockedApi.getAllGuns.mockResolvedValue(gunsResponse([gun1DefrostAgain]));
      mockedApi.getDefrostTodos.mockResolvedValue(defrostResponse([todo2]));
      mockedApi.getRecoveryTodos.mockResolvedValue(recoveryResponse([]));

      await useAppStore.getState().fetchAllData();

      const alerts = useAppStore.getState().newAlerts;
      expect(alerts).toHaveLength(1);
      expect(alerts[0].shutdownId).toBe(300);
    });

    it('fetch failure does not clear existing alerts', async () => {
      useAppStore.setState({
        newAlerts: [{ gunId: 'G1', slope: 'A坡', shutdownId: 100, shutdownAt: new Date().toISOString(), triggerReason: 'test' }],
        prevFetchSuccess: true,
        prevStatusMap: new Map([['G1', 'normal']]),
      });

      mockedApi.getAllGuns.mockRejectedValue(new Error('Network error'));

      await useAppStore.getState().fetchAllData();

      expect(useAppStore.getState().newAlerts).toHaveLength(1);
      expect(useAppStore.getState().error).toBe('Network error');
    });

    it('fetch failure does not change prevFetchSuccess', async () => {
      useAppStore.setState({
        prevFetchSuccess: true,
        prevStatusMap: new Map([['G1', 'normal']]),
      });

      mockedApi.getAllGuns.mockRejectedValue(new Error('Network error'));

      await useAppStore.getState().fetchAllData();

      expect(useAppStore.getState().prevFetchSuccess).toBe(true);
    });
  });
});
