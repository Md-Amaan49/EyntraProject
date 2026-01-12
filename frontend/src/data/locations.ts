// Indian States and Cities data for location dropdowns
export interface City {
  id: string;
  name: string;
  stateId: string;
}

export interface State {
  id: string;
  name: string;
  code: string;
}

export const INDIAN_STATES: State[] = [
  { id: 'AP', name: 'Andhra Pradesh', code: 'AP' },
  { id: 'AR', name: 'Arunachal Pradesh', code: 'AR' },
  { id: 'AS', name: 'Assam', code: 'AS' },
  { id: 'BR', name: 'Bihar', code: 'BR' },
  { id: 'CT', name: 'Chhattisgarh', code: 'CT' },
  { id: 'GA', name: 'Goa', code: 'GA' },
  { id: 'GJ', name: 'Gujarat', code: 'GJ' },
  { id: 'HR', name: 'Haryana', code: 'HR' },
  { id: 'HP', name: 'Himachal Pradesh', code: 'HP' },
  { id: 'JH', name: 'Jharkhand', code: 'JH' },
  { id: 'KA', name: 'Karnataka', code: 'KA' },
  { id: 'KL', name: 'Kerala', code: 'KL' },
  { id: 'MP', name: 'Madhya Pradesh', code: 'MP' },
  { id: 'MH', name: 'Maharashtra', code: 'MH' },
  { id: 'MN', name: 'Manipur', code: 'MN' },
  { id: 'ML', name: 'Meghalaya', code: 'ML' },
  { id: 'MZ', name: 'Mizoram', code: 'MZ' },
  { id: 'NL', name: 'Nagaland', code: 'NL' },
  { id: 'OR', name: 'Odisha', code: 'OR' },
  { id: 'PB', name: 'Punjab', code: 'PB' },
  { id: 'RJ', name: 'Rajasthan', code: 'RJ' },
  { id: 'SK', name: 'Sikkim', code: 'SK' },
  { id: 'TN', name: 'Tamil Nadu', code: 'TN' },
  { id: 'TG', name: 'Telangana', code: 'TG' },
  { id: 'TR', name: 'Tripura', code: 'TR' },
  { id: 'UP', name: 'Uttar Pradesh', code: 'UP' },
  { id: 'UT', name: 'Uttarakhand', code: 'UT' },
  { id: 'WB', name: 'West Bengal', code: 'WB' },
  { id: 'AN', name: 'Andaman and Nicobar Islands', code: 'AN' },
  { id: 'CH', name: 'Chandigarh', code: 'CH' },
  { id: 'DN', name: 'Dadra and Nagar Haveli and Daman and Diu', code: 'DN' },
  { id: 'DL', name: 'Delhi', code: 'DL' },
  { id: 'JK', name: 'Jammu and Kashmir', code: 'JK' },
  { id: 'LA', name: 'Ladakh', code: 'LA' },
  { id: 'LD', name: 'Lakshadweep', code: 'LD' },
  { id: 'PY', name: 'Puducherry', code: 'PY' },
];

export const INDIAN_CITIES: City[] = [
  // Andhra Pradesh
  { id: 'AP001', name: 'Visakhapatnam', stateId: 'AP' },
  { id: 'AP002', name: 'Vijayawada', stateId: 'AP' },
  { id: 'AP003', name: 'Guntur', stateId: 'AP' },
  { id: 'AP004', name: 'Nellore', stateId: 'AP' },
  { id: 'AP005', name: 'Kurnool', stateId: 'AP' },
  { id: 'AP006', name: 'Rajahmundry', stateId: 'AP' },
  { id: 'AP007', name: 'Tirupati', stateId: 'AP' },
  { id: 'AP008', name: 'Anantapur', stateId: 'AP' },

  // Karnataka
  { id: 'KA001', name: 'Bangalore', stateId: 'KA' },
  { id: 'KA002', name: 'Mysore', stateId: 'KA' },
  { id: 'KA003', name: 'Hubli', stateId: 'KA' },
  { id: 'KA004', name: 'Mangalore', stateId: 'KA' },
  { id: 'KA005', name: 'Belgaum', stateId: 'KA' },
  { id: 'KA006', name: 'Gulbarga', stateId: 'KA' },
  { id: 'KA007', name: 'Davangere', stateId: 'KA' },
  { id: 'KA008', name: 'Bellary', stateId: 'KA' },

  // Maharashtra
  { id: 'MH001', name: 'Mumbai', stateId: 'MH' },
  { id: 'MH002', name: 'Pune', stateId: 'MH' },
  { id: 'MH003', name: 'Nagpur', stateId: 'MH' },
  { id: 'MH004', name: 'Nashik', stateId: 'MH' },
  { id: 'MH005', name: 'Aurangabad', stateId: 'MH' },
  { id: 'MH006', name: 'Solapur', stateId: 'MH' },
  { id: 'MH007', name: 'Amravati', stateId: 'MH' },
  { id: 'MH008', name: 'Kolhapur', stateId: 'MH' },

  // Tamil Nadu
  { id: 'TN001', name: 'Chennai', stateId: 'TN' },
  { id: 'TN002', name: 'Coimbatore', stateId: 'TN' },
  { id: 'TN003', name: 'Madurai', stateId: 'TN' },
  { id: 'TN004', name: 'Tiruchirappalli', stateId: 'TN' },
  { id: 'TN005', name: 'Salem', stateId: 'TN' },
  { id: 'TN006', name: 'Tirunelveli', stateId: 'TN' },
  { id: 'TN007', name: 'Erode', stateId: 'TN' },
  { id: 'TN008', name: 'Vellore', stateId: 'TN' },

  // Gujarat
  { id: 'GJ001', name: 'Ahmedabad', stateId: 'GJ' },
  { id: 'GJ002', name: 'Surat', stateId: 'GJ' },
  { id: 'GJ003', name: 'Vadodara', stateId: 'GJ' },
  { id: 'GJ004', name: 'Rajkot', stateId: 'GJ' },
  { id: 'GJ005', name: 'Bhavnagar', stateId: 'GJ' },
  { id: 'GJ006', name: 'Jamnagar', stateId: 'GJ' },
  { id: 'GJ007', name: 'Junagadh', stateId: 'GJ' },
  { id: 'GJ008', name: 'Gandhinagar', stateId: 'GJ' },

  // Rajasthan
  { id: 'RJ001', name: 'Jaipur', stateId: 'RJ' },
  { id: 'RJ002', name: 'Jodhpur', stateId: 'RJ' },
  { id: 'RJ003', name: 'Udaipur', stateId: 'RJ' },
  { id: 'RJ004', name: 'Kota', stateId: 'RJ' },
  { id: 'RJ005', name: 'Bikaner', stateId: 'RJ' },
  { id: 'RJ006', name: 'Ajmer', stateId: 'RJ' },
  { id: 'RJ007', name: 'Bharatpur', stateId: 'RJ' },
  { id: 'RJ008', name: 'Alwar', stateId: 'RJ' },

  // Uttar Pradesh
  { id: 'UP001', name: 'Lucknow', stateId: 'UP' },
  { id: 'UP002', name: 'Kanpur', stateId: 'UP' },
  { id: 'UP003', name: 'Ghaziabad', stateId: 'UP' },
  { id: 'UP004', name: 'Agra', stateId: 'UP' },
  { id: 'UP005', name: 'Meerut', stateId: 'UP' },
  { id: 'UP006', name: 'Varanasi', stateId: 'UP' },
  { id: 'UP007', name: 'Allahabad', stateId: 'UP' },
  { id: 'UP008', name: 'Bareilly', stateId: 'UP' },

  // West Bengal
  { id: 'WB001', name: 'Kolkata', stateId: 'WB' },
  { id: 'WB002', name: 'Howrah', stateId: 'WB' },
  { id: 'WB003', name: 'Durgapur', stateId: 'WB' },
  { id: 'WB004', name: 'Asansol', stateId: 'WB' },
  { id: 'WB005', name: 'Siliguri', stateId: 'WB' },
  { id: 'WB006', name: 'Malda', stateId: 'WB' },
  { id: 'WB007', name: 'Berhampore', stateId: 'WB' },
  { id: 'WB008', name: 'Kharagpur', stateId: 'WB' },

  // Punjab
  { id: 'PB001', name: 'Ludhiana', stateId: 'PB' },
  { id: 'PB002', name: 'Amritsar', stateId: 'PB' },
  { id: 'PB003', name: 'Jalandhar', stateId: 'PB' },
  { id: 'PB004', name: 'Patiala', stateId: 'PB' },
  { id: 'PB005', name: 'Bathinda', stateId: 'PB' },
  { id: 'PB006', name: 'Mohali', stateId: 'PB' },
  { id: 'PB007', name: 'Firozpur', stateId: 'PB' },
  { id: 'PB008', name: 'Pathankot', stateId: 'PB' },

  // Haryana
  { id: 'HR001', name: 'Faridabad', stateId: 'HR' },
  { id: 'HR002', name: 'Gurgaon', stateId: 'HR' },
  { id: 'HR003', name: 'Panipat', stateId: 'HR' },
  { id: 'HR004', name: 'Ambala', stateId: 'HR' },
  { id: 'HR005', name: 'Yamunanagar', stateId: 'HR' },
  { id: 'HR006', name: 'Rohtak', stateId: 'HR' },
  { id: 'HR007', name: 'Hisar', stateId: 'HR' },
  { id: 'HR008', name: 'Karnal', stateId: 'HR' },

  // Delhi
  { id: 'DL001', name: 'New Delhi', stateId: 'DL' },
  { id: 'DL002', name: 'Delhi Cantonment', stateId: 'DL' },
  { id: 'DL003', name: 'Dwarka', stateId: 'DL' },
  { id: 'DL004', name: 'Rohini', stateId: 'DL' },
  { id: 'DL005', name: 'Janakpuri', stateId: 'DL' },
  { id: 'DL006', name: 'Lajpat Nagar', stateId: 'DL' },
  { id: 'DL007', name: 'Karol Bagh', stateId: 'DL' },
  { id: 'DL008', name: 'Connaught Place', stateId: 'DL' },

  // Kerala
  { id: 'KL001', name: 'Thiruvananthapuram', stateId: 'KL' },
  { id: 'KL002', name: 'Kochi', stateId: 'KL' },
  { id: 'KL003', name: 'Kozhikode', stateId: 'KL' },
  { id: 'KL004', name: 'Thrissur', stateId: 'KL' },
  { id: 'KL005', name: 'Kollam', stateId: 'KL' },
  { id: 'KL006', name: 'Palakkad', stateId: 'KL' },
  { id: 'KL007', name: 'Alappuzha', stateId: 'KL' },
  { id: 'KL008', name: 'Malappuram', stateId: 'KL' },

  // Add more cities for other states as needed...
];

// Helper functions
export const getCitiesByState = (stateId: string): City[] => {
  return INDIAN_CITIES.filter(city => city.stateId === stateId);
};

export const getStateById = (stateId: string): State | undefined => {
  return INDIAN_STATES.find(state => state.id === stateId);
};

export const getCityById = (cityId: string): City | undefined => {
  return INDIAN_CITIES.find(city => city.id === cityId);
};