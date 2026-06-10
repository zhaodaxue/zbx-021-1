import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import Dashboard from '../pages/Dashboard';
import { makeGun, makeSlopeGroups } from './helpers';

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/gun/:id" element={<div>Gun Detail</div>} />
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
    highlightedGunId: null,
  });
  vi.clearAllMocks();
});

describe('Dashboard component integration', () => {
  it('renders gun cards for each gun in slope groups', () => {
    const guns = [
      makeGun({ id: 'G1', slope: 'A坡', status: 'normal' }),
      makeGun({ id: 'G2', slope: 'A坡', status: 'defrost_required' }),
    ];
    useAppStore.setState({ slopeGroups: makeSlopeGroups(guns) });
    renderDashboard();
    expect(screen.getByText('G1')).toBeInTheDocument();
    expect(screen.getByText('G2')).toBeInTheDocument();
  });

  it('shows "需融霜" badge for defrost_required guns', () => {
    const guns = [makeGun({ id: 'G1', slope: 'A坡', status: 'defrost_required' })];
    useAppStore.setState({ slopeGroups: makeSlopeGroups(guns) });
    renderDashboard();
    const badges = screen.getAllByText('需融霜');
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it('highlightedGunId sets highlighted prop on GunCard (ring visual)', () => {
    const guns = [
      makeGun({ id: 'G1', slope: 'A坡', status: 'defrost_required' }),
      makeGun({ id: 'G2', slope: 'A坡', status: 'normal' }),
    ];
    useAppStore.setState({ slopeGroups: makeSlopeGroups(guns), highlightedGunId: 'G1' });
    renderDashboard();

    const g1Card = screen.getByText('G1').closest('a');
    expect(g1Card?.className).toContain('ring-4');
    const g2Card = screen.getByText('G2').closest('a');
    expect(g2Card?.className).not.toContain('ring-4');
  });

  it('clicking a highlighted GunCard clears highlightedGunId', () => {
    const guns = [makeGun({ id: 'G1', slope: 'A坡', status: 'defrost_required' })];
    useAppStore.setState({ slopeGroups: makeSlopeGroups(guns), highlightedGunId: 'G1' });
    renderDashboard();

    const g1Card = screen.getByText('G1').closest('a');
    fireEvent.click(g1Card!);

    expect(useAppStore.getState().highlightedGunId).toBeNull();
  });

  it('defrost_required count shows in stats card', () => {
    const guns = [
      makeGun({ id: 'G1', slope: 'A坡', status: 'defrost_required' }),
      makeGun({ id: 'G2', slope: 'A坡', status: 'normal' }),
    ];
    useAppStore.setState({
      slopeGroups: makeSlopeGroups(guns),
      defrostTodos: [{ id: 'G1', slope: 'A坡', minWaterPressure: 10, status: 'defrost_required', shutdownId: 100, shutdownAt: new Date().toISOString(), triggerReason: 'test' }],
      recoveryTodos: [],
    });
    renderDashboard();

    const statsLabel = screen.getByText('需融霜', { selector: '.text-sm.text-slate-500' });
    expect(statsLabel).toBeInTheDocument();
  });

  it('shows slope group headers with "有需融霜" indicator when applicable', () => {
    const guns = [makeGun({ id: 'G1', slope: 'A坡', status: 'defrost_required' })];
    useAppStore.setState({ slopeGroups: makeSlopeGroups(guns) });
    renderDashboard();
    expect(screen.getByText('有需融霜')).toBeInTheDocument();
  });

  it('does not show "有需融霜" when no guns are defrost_required', () => {
    const guns = [makeGun({ id: 'G1', slope: 'A坡', status: 'normal' })];
    useAppStore.setState({ slopeGroups: makeSlopeGroups(guns) });
    renderDashboard();
    expect(screen.queryByText('有需融霜')).not.toBeInTheDocument();
  });

  it('shows total guns count in stats', () => {
    const guns = [
      makeGun({ id: 'G1', slope: 'A坡', status: 'normal' }),
      makeGun({ id: 'G2', slope: 'A坡', status: 'normal' }),
    ];
    useAppStore.setState({
      slopeGroups: makeSlopeGroups(guns),
      defrostTodos: [],
      recoveryTodos: [],
    });
    renderDashboard();

    const totalLabel = screen.getByText('造雪枪总数');
    const parent = totalLabel.parentElement;
    const valueEl = parent?.querySelector('.text-2xl');
    expect(valueEl?.textContent).toBe('2');
  });
});
