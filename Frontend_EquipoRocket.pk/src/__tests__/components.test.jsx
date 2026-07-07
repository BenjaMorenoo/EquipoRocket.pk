import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

// ─── TypeBadge ────────────────────────────────────────────────────────────────

import TypeBadge from '../components/TypeBadge';

describe('TypeBadge', () => {
  it('renders null when type is falsy', () => {
    const { container } = render(<TypeBadge type={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders type as string', () => {
    render(<TypeBadge type="fire" />);
    expect(screen.getByText('Fire')).toBeInTheDocument();
  });

  it('renders type from object { type: { name } }', () => {
    render(<TypeBadge type={{ type: { name: 'water' } }} />);
    expect(screen.getByText('Water')).toBeInTheDocument();
  });

  it('renders type from object { name }', () => {
    render(<TypeBadge type={{ name: 'grass' } } />);
    expect(screen.getByText('Grass')).toBeInTheDocument();
  });

  it('capitalizes first letter', () => {
    render(<TypeBadge type="dragon" />);
    expect(screen.getByText('Dragon')).toBeInTheDocument();
  });

  it('renders different sizes without crashing', () => {
    ['xs', 'sm', 'md', 'lg'].forEach((size) => {
      const { unmount } = render(<TypeBadge type="fire" size={size} />);
      expect(screen.getAllByText('Fire').length).toBeGreaterThan(0);
      unmount();
    });
  });

  it('uses fallback color for unknown type', () => {
    const { container } = render(<TypeBadge type="unknown_xyz" />);
    expect(container.firstChild).not.toBeNull();
  });
});

// ─── ErrorBoundary ────────────────────────────────────────────────────────────

import ErrorBoundary from '../components/ErrorBoundary';

const ThrowError = ({ shouldThrow }) => {
  if (shouldThrow) throw new Error('Test error from child');
  return <div>Child OK</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Child OK')).toBeInTheDocument();
  });

  it('catches error and renders fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Ha ocurrido un error/)).toBeInTheDocument();
    expect(screen.queryByText('Child OK')).not.toBeInTheDocument();
  });

  it('shows error details in summary', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Detalles del error')).toBeInTheDocument();
  });

  it('shows the error message in the details', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Test error from child/)).toBeInTheDocument();
  });
});

// ─── ConfirmModal ─────────────────────────────────────────────────────────────

import ConfirmModal from '../components/ConfirmModal';

describe('ConfirmModal', () => {
  const defaultProps = {
    onClose: vi.fn(),
    onConfirm: vi.fn(),
  };

  it('renders the default title', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText(/seguro/i)).toBeInTheDocument();
  });

  it('renders a custom title', () => {
    render(<ConfirmModal {...defaultProps} title="Eliminar equipo" />);
    expect(screen.getByText('Eliminar equipo')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<ConfirmModal {...defaultProps} description="Esta acción no se puede deshacer" />);
    expect(screen.getByText(/Esta acción/)).toBeInTheDocument();
  });

  it('renders Cancel button', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText(/cancelar/i)).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<ConfirmModal onClose={onClose} onConfirm={vi.fn()} />);
    fireEvent.click(screen.getByText(/cancelar/i));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<ConfirmModal onClose={onClose} onConfirm={vi.fn()} />);
    fireEvent.click(container.firstChild);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows requireTyping input when requireTyping is set', () => {
    render(<ConfirmModal {...defaultProps} requireTyping="CONFIRMAR" />);
    expect(screen.getByPlaceholderText('CONFIRMAR')).toBeInTheDocument();
  });

  it('shows password input when requirePassword is true', () => {
    render(<ConfirmModal {...defaultProps} requirePassword={true} />);
    expect(screen.getByPlaceholderText(/•+/)).toBeInTheDocument();
  });

  it('confirm button is disabled until typing matches', async () => {
    render(<ConfirmModal {...defaultProps} requireTyping="BORRAR" />);
    const confirmBtn = screen.getByText(/confirmar/i, { selector: 'button' });
    expect(confirmBtn).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('BORRAR'), { target: { value: 'BORRAR' } });
    expect(confirmBtn).not.toBeDisabled();
  });

  it('calls onConfirm when typing matches and confirm is clicked', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<ConfirmModal onClose={vi.fn()} onConfirm={onConfirm} requireTyping="OK" />);

    fireEvent.change(screen.getByPlaceholderText('OK'), { target: { value: 'OK' } });
    await act(async () => {
      fireEvent.click(screen.getByText(/confirmar/i, { selector: 'button' }));
    });
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('shows error when onConfirm throws', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('Error del servidor'));
    render(<ConfirmModal onClose={vi.fn()} onConfirm={onConfirm} requireTyping="X" />);

    fireEvent.change(screen.getByPlaceholderText('X'), { target: { value: 'X' } });
    await act(async () => {
      fireEvent.click(screen.getByText(/confirmar/i, { selector: 'button' }));
    });
    expect(screen.getByText(/Error del servidor/)).toBeInTheDocument();
  });

  it('toggles password visibility', () => {
    render(<ConfirmModal {...defaultProps} requirePassword={true} />);
    const input = screen.getByPlaceholderText(/•+/);
    expect(input.type).toBe('password');

    const toggleBtn = input.parentElement.querySelector('button');
    fireEvent.click(toggleBtn);
    expect(input.type).toBe('text');
  });

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(<ConfirmModal onClose={onClose} onConfirm={vi.fn()} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});

// ─── Footer ──────────────────────────────────────────────────────────────────

vi.mock('../components/LegalModal', () => ({
  default: ({ open, onClose }) =>
    open ? <div data-testid="legal-modal">Modal Abierto</div> : null,
}));

import Footer from '../components/Footer';

describe('Footer', () => {
  it('renders brand name', () => {
    render(<Footer />);
    expect(screen.getByText('EquipoRocket.pk')).toBeInTheDocument();
  });

  it('renders disclaimer text', () => {
    render(<Footer />);
    expect(screen.getByText(/fan-made/i)).toBeInTheDocument();
  });

  it('renders Terms button', () => {
    render(<Footer />);
    expect(screen.getByText(/términos/i)).toBeInTheDocument();
  });

  it('renders Privacy button', () => {
    render(<Footer />);
    expect(screen.getByText(/privacidad/i)).toBeInTheDocument();
  });

  it('opens legal modal when Terms is clicked', () => {
    render(<Footer />);
    fireEvent.click(screen.getByText(/términos/i));
    expect(screen.getByTestId('legal-modal')).toBeInTheDocument();
  });

  it('opens legal modal when Privacy is clicked', () => {
    render(<Footer />);
    fireEvent.click(screen.getByText(/privacidad/i));
    expect(screen.getByTestId('legal-modal')).toBeInTheDocument();
  });

  it('shows law reference', () => {
    render(<Footer />);
    expect(screen.getByText(/21\.719/)).toBeInTheDocument();
  });

  it('hover styles on buttons do not crash', () => {
    render(<Footer />);
    const termsBtn = screen.getByText(/términos/i);
    fireEvent.mouseEnter(termsBtn);
    fireEvent.mouseLeave(termsBtn);
    const privacyBtn = screen.getByText(/privacidad/i);
    fireEvent.mouseEnter(privacyBtn);
    fireEvent.mouseLeave(privacyBtn);
  });
});

// ─── PokemonSprite ────────────────────────────────────────────────────────────

vi.mock('../services/api', () => ({
  getPokemon: vi.fn(),
}));

import { getPokemon } from '../services/api';
import PokemonSprite from '../components/PokemonSprite';

describe('PokemonSprite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading placeholder when name provided (url=undefined)', () => {
    getPokemon.mockReturnValue(new Promise(() => {}));
    const { container } = render(<PokemonSprite name="loading-test-001" size={40} />);
    // Should show loading div (no img, no ?)
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  it('renders ? placeholder when sprite is null', async () => {
    getPokemon.mockResolvedValue(null);
    const { findByText } = render(<PokemonSprite name="null-sprite-002" size={40} />);
    expect(await findByText('?')).toBeInTheDocument();
  });

  it('renders img when sprite is available', async () => {
    getPokemon.mockResolvedValue({
      sprites: {
        other: { 'official-artwork': { front_default: 'https://img.example.com/charizard.png' } },
        front_default: null,
      },
    });
    const { findByRole } = render(<PokemonSprite name="charizard-artwork-003" />);
    const img = await findByRole('img');
    expect(img).toHaveAttribute('src', 'https://img.example.com/charizard.png');
  });

  it('falls back to front_default sprite', async () => {
    getPokemon.mockResolvedValue({
      sprites: {
        other: { 'official-artwork': { front_default: null } },
        front_default: 'https://img.example.com/blastoise-small.png',
      },
    });
    const { findByRole } = render(<PokemonSprite name="blastoise-fallback-004" />);
    const img = await findByRole('img');
    expect(img).toHaveAttribute('src', 'https://img.example.com/blastoise-small.png');
  });

  it('renders placeholder when no name', () => {
    getPokemon.mockResolvedValue(null);
    const { container } = render(<PokemonSprite name={null} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('uses custom size', async () => {
    getPokemon.mockResolvedValue({
      sprites: { other: { 'official-artwork': { front_default: 'http://x.com/img.png' } } },
    });
    const { findByRole } = render(<PokemonSprite name="bulbasaur-size-005" size={80} />);
    const img = await findByRole('img');
    expect(img).toHaveAttribute('width', '80');
  });

  it('handles image load error (sets opacity)', async () => {
    getPokemon.mockResolvedValue({
      sprites: { other: { 'official-artwork': { front_default: 'http://x.com/broken.png' } } },
    });
    const { findByRole } = render(<PokemonSprite name="error-handler-007" />);
    const img = await findByRole('img');
    fireEvent.error(img);
    expect(img.style.opacity).toBe('0.15');
  });
});

// ─── TypeCoverageGrid ─────────────────────────────────────────────────────────

import { TypeCoverageGrid, TeamWeaknessChart, PokemonStatsRadar } from '../components/TypeCoverageChart';

describe('TypeCoverageGrid', () => {
  it('renders all 18 type badges', () => {
    const { container } = render(<TypeCoverageGrid team={[]} />);
    const badges = container.firstChild.children;
    expect(badges.length).toBe(18);
  });

  it('marks types covered by team', () => {
    const firePokemon = { types: [{ type: { name: 'fire' } }] };
    render(<TypeCoverageGrid team={[firePokemon]} />);
    expect(screen.getByText('fire')).toBeInTheDocument();
  });

  it('renders with null entries in team', () => {
    const { container } = render(<TypeCoverageGrid team={[null, null]} />);
    expect(container.firstChild.children.length).toBe(18);
  });
});

describe('TeamWeaknessChart', () => {
  it('renders empty state when team is empty', () => {
    render(<TeamWeaknessChart team={[]} />);
    expect(screen.getByText(/agrega/i)).toBeInTheDocument();
  });

  it('renders empty state when team has only nulls', () => {
    render(<TeamWeaknessChart team={[null, null]} />);
    expect(screen.getByText(/agrega/i)).toBeInTheDocument();
  });

  it('renders chart container when team has pokemon', () => {
    const pokemon = { types: [{ type: { name: 'fire' } }] };
    const { container } = render(<TeamWeaknessChart team={[pokemon]} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe('PokemonStatsRadar', () => {
  it('returns null when no pokemon', () => {
    const { container } = render(<PokemonStatsRadar pokemon={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders chart container with stats', () => {
    const pokemon = {
      stats: [
        { stat: { name: 'hp' }, base_stat: 45 },
        { stat: { name: 'attack' }, base_stat: 49 },
        { stat: { name: 'defense' }, base_stat: 49 },
        { stat: { name: 'special-attack' }, base_stat: 65 },
        { stat: { name: 'special-defense' }, base_stat: 65 },
        { stat: { name: 'speed' }, base_stat: 45 },
      ],
    };
    const { container } = render(<PokemonStatsRadar pokemon={pokemon} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
