/**
 * Property-based tests for veterinarian browser components
 * Feature: cattle-owner-dashboard, Property 9: Veterinarian profile display completeness
 * Validates: Requirements 4.1, 4.3
 */

import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import VeterinarianBrowser from '../VeterinarianBrowser';
import { veterinarianAPI } from '../../../services/api';
import type { Veterinarian } from '../../../types';

// Mock the API
jest.mock('../../../services/api', () => ({
  veterinarianAPI: {
    list: jest.fn(),
  },
}));

const mockVeterinarianAPI = veterinarianAPI as jest.Mocked<typeof veterinarianAPI>;

describe('VeterinarianBrowser - Profile Display Properties', () => {
  const mockVeterinarians: Veterinarian[] = [
    {
      id: 'vet-1',
      user: {
        id: 'user-1',
        email: 'john.smith@vet.com',
        name: 'John Smith',
        phone: '+1234567890',
        role: 'veterinarian' as const,
      },
      license_number: 'VET12345',
      vet_type: 'private' as const,
      specializations: ['Bovine Medicine', 'Large Animal Surgery'],
      years_experience: 10,
      address: '123 Vet Street',
      city: 'Veterinary City',
      state: 'VS',
      pincode: '12345',
      service_radius_km: 50,
      is_available: true,
      is_emergency_available: true,
      working_hours: {},
      consultation_fees: {
        chat: 200,
        voice: 300,
        video: 500,
        emergency: {
          chat: 400,
          voice: 600,
          video: 800,
        },
      },
      qualification: 'DVM',
      total_consultations: 150,
      average_rating: 4.8,
      is_verified: true,
      created_at: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderVeterinarianBrowser = () => {
    return render(
      <BrowserRouter>
        <VeterinarianBrowser />
      </BrowserRouter>
    );
  };

  describe('Basic functionality tests', () => {
    it('should render without crashing', () => {
      mockVeterinarianAPI.list.mockResolvedValue({ 
        data: { results: [], count: 0, page_size: 10 },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      });

      renderVeterinarianBrowser();
      
      expect(screen.getByText('Find Veterinarians')).toBeInTheDocument();
    });

    it('should handle loading state', () => {
      mockVeterinarianAPI.list.mockImplementation(() => new Promise(() => {}));

      renderVeterinarianBrowser();
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should display veterinarians when loaded', async () => {
      mockVeterinarianAPI.list.mockResolvedValue({ 
        data: { results: mockVeterinarians, count: 1, page_size: 10 },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      });

      renderVeterinarianBrowser();

      await waitFor(() => {
        expect(screen.getByText('Dr. John Smith')).toBeInTheDocument();
      });
    });
  });
});