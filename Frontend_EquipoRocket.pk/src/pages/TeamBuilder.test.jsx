// Pruebas unitarias de src/pages/TeamBuilder.jsx
// Cubre UT-FE-02: el equipo tiene exactamente TEAM_SIZE=6 espacios (no puede
// crecer a un 7mo espacio) y verifica si seleccionar el mismo Pokémon para dos
// espacios distintos es rechazado o permitido (duplicados).
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TeamBuilder from './TeamBuilder';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('../components/TypeCoverageChart', () => ({
  TeamWeaknessChart: () => null,
  TypeCoverageGrid: () => null,
  PokemonStatsRadar: () => null,
}));

// SearchModal real depende de la API de PokéAPI/backend para listar Pokémon;
// se reemplaza por un stub que ofrece un único botón para elegir "pikachu" y
// así disparar `onSelect` (= handleSelect) bajo control del test.
vi.mock('../components/SearchModal', () => ({
  default: ({ onSelect }) => (
    <div data-testid="search-modal">
      <button onClick={() => onSelect({ name: 'pikachu', id: 25, types: [{ type: { name: 'electric' } }], stats: [] })}>
        Elegir pikachu (mock)
      </button>
    </div>
  ),
}));

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getItemsList: vi.fn().mockResolvedValue({ data: { items: [] } }),
    getSpreadsList: vi.fn().mockResolvedValue({ data: { spreads: [] } }),
    getBackendPokemon: vi.fn().mockResolvedValue({ data: { pokemon: { abilities: [], moves: [] } } }),
    getPokemon: vi.fn().mockResolvedValue({ sprites: {}, types: [], stats: [] }),
  };
});

describe('UT-FE-02: límite de equipo y duplicados en TeamBuilder', () => {
  test('(a) el equipo tiene exactamente 6 espacios y no aparece un 7mo espacio', async () => {
    render(<TeamBuilder onSave={vi.fn()} onNavigate={vi.fn()} />);

    for (let slot = 1; slot <= 6; slot++) {
      expect(await screen.findByRole('button', { name: `Agregar Pokémon al espacio ${slot}` })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: 'Agregar Pokémon al espacio 7' })).not.toBeInTheDocument();
  });

  test('(b) seleccionar el mismo Pokémon para dos espacios distintos', async () => {
    render(<TeamBuilder onSave={vi.fn()} onNavigate={vi.fn()} />);

    // Espacio 1: abrir búsqueda y elegir "pikachu"
    fireEvent.click(await screen.findByRole('button', { name: 'Agregar Pokémon al espacio 1' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Elegir pikachu (mock)' }));

    // El espacio 1 ahora está ocupado por pikachu
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Agregar Pokémon al espacio 1' })).not.toBeInTheDocument());
    expect(await screen.findByRole('button', { name: 'Remover pikachu' })).toBeInTheDocument();

    // Espacio 2: abrir búsqueda y elegir "pikachu" de nuevo (mismo Pokémon)
    fireEvent.click(await screen.findByRole('button', { name: 'Agregar Pokémon al espacio 2' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Elegir pikachu (mock)' }));

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Agregar Pokémon al espacio 2' })).not.toBeInTheDocument());

    // plan_pruebas.md espera que un Pokémon duplicado sea rechazado: solo
    // debería quedar una tarjeta "pikachu" y el espacio 2 debería seguir
    // pidiendo agregar un Pokémon.
    const removeButtons = screen.getAllByRole('button', { name: 'Remover pikachu' });
    expect(removeButtons).toHaveLength(1);
  });
});
