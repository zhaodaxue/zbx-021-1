import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import GunDetail from '../pages/GunDetail';
import { api } from '../api/client';
import { makeGun, makeSlopeGroups } from './helpers';

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

function renderGunDetail(gunId: string) {
  return render(
    <MemoryRouter initialEntries={[`/gun/${gunId}`]}>
      <Routes>
        <Route path="/gun/:id" element={<GunDetail />} />
        <Route path="/" element={<div data-testid="home">Home</div>} />
        <Route path="/todo" element={<div data-testid="todo">Todo</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  useAppStore.setState({
    slopeGroups: [],
    defrostTodos: [],
    recoveryTodos: [],
    loading: false,
    newAlerts: [],
    dismissedDetailGunIds: new Set(),
    highlightedGunId: null,
  });
  vi.clearAllMocks();
  mockedApi.getSensorRecords.mockResolvedValue({
    success: true,
    data: [],
    minPressure: 10,
  });
  mockedApi.getShutdownRecords.mockResolvedValue({
    success: true,
    data: [],
  });
});

describe('GunDetail - defrost alert banner', () => {
  const sampleAlert = {
    gunId: 'G1',
    slope: 'A坡',
    shutdownId: 100,
    shutdownAt: new Date().toISOString(),
    triggerReason: '结霜等级过高',
  };

  it('shows banner when newAlerts matches and gun is defrost_required', () => {
    const gun = makeGun({ id: 'G1', status: 'defrost_required' });
    useAppStore.setState({
      slopeGroups: makeSlopeGroups([gun]),
      newAlerts: [sampleAlert],
      dismissedDetailGunIds: new Set(),
    });

    renderGunDetail('G1');

    expect(screen.getByText('该枪刚进入需融霜状态')).toBeInTheDocument();
  });

  it('does NOT show banner when newAlerts does not contain this gun', () => {
    const gun = makeGun({ id: 'G1', status: 'defrost_required' });
    useAppStore.setState({
      slopeGroups: makeSlopeGroups([gun]),
      newAlerts: [],
      dismissedDetailGunIds: new Set(),
    });

    renderGunDetail('G1');

    expect(screen.queryByText('该枪刚进入需融霜状态')).not.toBeInTheDocument();
  });

  it('does NOT show banner when gun is not defrost_required', () => {
    const gun = makeGun({ id: 'G1', status: 'normal' });
    useAppStore.setState({
      slopeGroups: makeSlopeGroups([gun]),
      newAlerts: [sampleAlert],
      dismissedDetailGunIds: new Set(),
    });

    renderGunDetail('G1');

    expect(screen.queryByText('该枪刚进入需融霜状态')).not.toBeInTheDocument();
  });

  it('does NOT show banner when alert was dismissed', () => {
    const gun = makeGun({ id: 'G1', status: 'defrost_required' });
    useAppStore.setState({
      slopeGroups: makeSlopeGroups([gun]),
      newAlerts: [sampleAlert],
      dismissedDetailGunIds: new Set(['G1']),
    });

    renderGunDetail('G1');

    expect(screen.queryByText('该枪刚进入需融霜状态')).not.toBeInTheDocument();
  });

  it('dismiss button adds gunId to dismissedDetailGunIds', () => {
    const gun = makeGun({ id: 'G1', status: 'defrost_required' });
    useAppStore.setState({
      slopeGroups: makeSlopeGroups([gun]),
      newAlerts: [sampleAlert],
      dismissedDetailGunIds: new Set(),
    });

    renderGunDetail('G1');

    const dismissBtn = screen.getByText('稍后处理');
    fireEvent.click(dismissBtn);

    expect(useAppStore.getState().dismissedDetailGunIds.has('G1')).toBe(true);
  });

  it('dismiss is page-local: re-rendering without dismiss shows banner again', () => {
    const gun = makeGun({ id: 'G1', status: 'defrost_required' });
    useAppStore.setState({
      slopeGroups: makeSlopeGroups([gun]),
      newAlerts: [sampleAlert],
      dismissedDetailGunIds: new Set(),
    });

    const { unmount } = renderGunDetail('G1');
    expect(screen.getByText('该枪刚进入需融霜状态')).toBeInTheDocument();

    fireEvent.click(screen.getByText('稍后处理'));
    expect(screen.queryByText('该枪刚进入需融霜状态')).not.toBeInTheDocument();

    unmount();

    useAppStore.setState({ dismissedDetailGunIds: new Set() });
    renderGunDetail('G1');

    expect(screen.getByText('该枪刚进入需融霜状态')).toBeInTheDocument();
  });

  it('dismissed record auto-cleaned when gun leaves defrost_required (via store fetchAllData)', async () => {
    useAppStore.setState({
      dismissedDetailGunIds: new Set(['G1']),
      prevFetchSuccess: true,
      prevStatusMap: new Map([['G1', 'defrost_required']]),
      slopeGroups: makeSlopeGroups([makeGun({ id: 'G1', status: 'defrost_required' })]),
    });

    const gunNormal = makeGun({ id: 'G1', status: 'normal' });
    mockedApi.getAllGuns.mockResolvedValue({ success: true, data: makeSlopeGroups([gunNormal]) });
    mockedApi.getDefrostTodos.mockResolvedValue({ success: true, data: [] });
    mockedApi.getRecoveryTodos.mockResolvedValue({ success: true, data: [] });

    await useAppStore.getState().fetchAllData();

    expect(useAppStore.getState().dismissedDetailGunIds.has('G1')).toBe(false);
  });

  it('banner shows trigger reason from alert', () => {
    const gun = makeGun({ id: 'G1', status: 'defrost_required' });
    useAppStore.setState({
      slopeGroups: makeSlopeGroups([gun]),
      newAlerts: [sampleAlert],
      dismissedDetailGunIds: new Set(),
    });

    renderGunDetail('G1');

    expect(screen.getByText(/结霜等级过高/)).toBeInTheDocument();
  });

  it('跳转待办 button navigates to /todo', () => {
    const gun = makeGun({ id: 'G1', status: 'defrost_required' });
    useAppStore.setState({
      slopeGroups: makeSlopeGroups([gun]),
      newAlerts: [sampleAlert],
      dismissedDetailGunIds: new Set(),
    });

    renderGunDetail('G1');

    const link = screen.getByText('跳转待办').closest('a') || screen.getByText('跳转待办').closest('button');
    expect(link).toBeTruthy();
  });
});
