// Pruebas unitarias de src/pages/Simulations.jsx
// Cubre UT-FE-03: cómo handleSimulate interpreta la respuesta de
// `POST /api/montecarlo/simulate` y qué se renderiza.
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Simulations from './Simulations';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, username: 'tester' } }),
}));

const { mockTeam, simulateBattleMock } = vi.hoisted(() => ({
  mockTeam: { id: 1, name: 'MiEquipo', pokemon: [{ name: 'pikachu' }], created_by: 'manual' },
  simulateBattleMock: vi.fn(),
}));

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getTeams: vi.fn().mockResolvedValue([mockTeam]),
    getPublicTeams: vi.fn().mockResolvedValue([]),
    getBackendPokemon: vi.fn().mockResolvedValue({}),
    getPokemon: vi.fn().mockResolvedValue({ sprites: null, types: [], stats: [] }),
    simulateBattle: simulateBattleMock,
  };
});

// Selecciona "MiEquipo" como propio y como rival, y devuelve el botón "Simular Batalla" habilitado.
async function setupReadyToSimulate() {
  render(<Simulations onNavigate={vi.fn()} />);

  fireEvent.click(await screen.findByRole('button', { name: /MiEquipo/i }));
  await screen.findByText('✓ SELECCIONADO');

  fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });
  await screen.findByText('Equipo seleccionado:');

  const simBtn = screen.getByRole('button', { name: /Simular Batalla/i });
  await waitFor(() => expect(simBtn).not.toBeDisabled());
  return simBtn;
}

describe('UT-FE-03: interpretación de la respuesta de /api/montecarlo/simulate', () => {
  beforeEach(() => {
    simulateBattleMock.mockReset();
  });

  test('(a) respuesta real de ms_montecarlo ({success, win_rate}) se muestra como "Win Rate Estimado"', async () => {
    simulateBattleMock.mockResolvedValue({ success: true, simulation_id: 1, win_rate: 73.5, best_team: [] });

    const simBtn = await setupReadyToSimulate();
    fireEvent.click(simBtn);

    expect(await screen.findByText('Resultado de la Simulación')).toBeInTheDocument();
    expect(screen.getByText('74%')).toBeInTheDocument();
    expect(screen.getByText('Win rate 74%')).toBeInTheDocument();
  });

  test('(b) respuesta con team_a_win_probability/team_b_win_probability (sin win_rate) se trata como simulación fallida', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    simulateBattleMock.mockResolvedValue({ team_a_win_probability: 62.5, team_b_win_probability: 55.0 });

    const simBtn = await setupReadyToSimulate();
    fireEvent.click(simBtn);

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Simulation failed')));

    // plan_pruebas.md espera que la UI muestre ambos porcentajes (team_a y
    // team_b) "tal cual, sin forzar que sumen 100". En la práctica no existe
    // ningún elemento que muestre esos valores: no se renderiza el panel de
    // resultados en absoluto.
    expect(screen.queryByText('Resultado de la Simulación')).not.toBeInTheDocument();
    expect(screen.queryByText(/62.5/)).not.toBeInTheDocument();
    expect(screen.queryByText(/55/)).not.toBeInTheDocument();

    alertSpy.mockRestore();
  });
});
