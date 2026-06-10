import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import AlertBar from '../components/AlertBar';

function renderAlertBar(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AlertBar />
    </MemoryRouter>
  );
}

beforeEach(() => {
  useAppStore.setState({
    newAlerts: [],
    acknowledgedShutdownIds: new Set(),
    alertsCollapsed: false,
    highlightedGunId: null,
  });
  vi.clearAllMocks();
});

describe('AlertBar component integration', () => {
  const sampleAlerts = [
    { gunId: 'G1', slope: 'A坡', shutdownId: 100, shutdownAt: new Date().toISOString(), triggerReason: '结霜等级过高' },
    { gunId: 'G2', slope: 'B坡', shutdownId: 200, shutdownAt: new Date().toISOString(), triggerReason: '水压过低' },
  ];

  it('renders nothing when newAlerts is empty', () => {
    useAppStore.setState({ newAlerts: [] });
    const { container } = renderAlertBar();
    expect(container.innerHTML).toBe('');
  });

  it('shows alert bar with correct count when newAlerts exist', () => {
    useAppStore.setState({ newAlerts: sampleAlerts });
    renderAlertBar();
    expect(screen.getByText('新增需融霜提醒')).toBeInTheDocument();
    expect(screen.getByText('2 把造雪枪进入需融霜状态')).toBeInTheDocument();
  });

  it('shows each alert item with gunId and slope', () => {
    useAppStore.setState({ newAlerts: sampleAlerts });
    renderAlertBar();
    expect(screen.getByText('G1')).toBeInTheDocument();
    expect(screen.getByText('G2')).toBeInTheDocument();
  });

  it('hides AlertBar after acknowledging single alert', () => {
    useAppStore.setState({ newAlerts: [sampleAlerts[0]] });
    renderAlertBar();
    expect(screen.getByText('新增需融霜提醒')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('已知悉'));
    expect(useAppStore.getState().newAlerts).toEqual([]);
    expect(useAppStore.getState().acknowledgedShutdownIds.has(100)).toBe(true);
  });

  it('hides AlertBar after acknowledging all alerts', () => {
    useAppStore.setState({ newAlerts: sampleAlerts });
    renderAlertBar();
    expect(screen.getByText('新增需融霜提醒')).toBeInTheDocument();

    fireEvent.click(screen.getByText('全部已知悉'));
    expect(useAppStore.getState().newAlerts).toEqual([]);
    expect(useAppStore.getState().acknowledgedShutdownIds.has(100)).toBe(true);
    expect(useAppStore.getState().acknowledgedShutdownIds.has(200)).toBe(true);
  });

  it('click alert item sets highlightedGunId', () => {
    useAppStore.setState({ newAlerts: [sampleAlerts[0]] });
    renderAlertBar();

    const alertItem = screen.getByText('G1').closest('[class*="cursor-pointer"]');
    expect(alertItem).toBeTruthy();
    fireEvent.click(alertItem!);

    expect(useAppStore.getState().highlightedGunId).toBe('G1');
  });

  it('toggles collapsed state', () => {
    useAppStore.setState({ newAlerts: sampleAlerts, alertsCollapsed: false });
    renderAlertBar();

    expect(screen.getByText('G1')).toBeInTheDocument();
    expect(screen.getByText('G2')).toBeInTheDocument();

    const header = screen.getByText('新增需融霜提醒').closest('[class*="cursor-pointer"]');
    fireEvent.click(header!);

    expect(useAppStore.getState().alertsCollapsed).toBe(true);
  });

  it('shows "全部已知悉" only when more than 1 alert and not collapsed', () => {
    useAppStore.setState({ newAlerts: [sampleAlerts[0]], alertsCollapsed: false });
    renderAlertBar();
    expect(screen.queryByText('全部已知悉')).not.toBeInTheDocument();
  });

  it('shows "全部已知悉" when multiple alerts and not collapsed', () => {
    useAppStore.setState({ newAlerts: sampleAlerts, alertsCollapsed: false });
    renderAlertBar();
    expect(screen.getByText('全部已知悉')).toBeInTheDocument();
  });
});
