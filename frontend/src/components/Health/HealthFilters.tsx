import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  TextField,
  Button,
  Collapse,
  IconButton,
  Divider,
} from '@mui/material';
import {
  FilterList,
  ExpandMore,
  ExpandLess,
  Clear,
  Search,
} from '@mui/icons-material';
// Note: DatePicker components will be added when @mui/x-date-pickers is installed
import { HealthFilters as HealthFiltersType } from '../../types';

interface HealthFiltersProps {
  filters: HealthFiltersType;
  onFiltersChange: (filters: HealthFiltersType) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
}

const eventTypeOptions = [
  { value: 'symptom', label: 'Symptom Reports' },
  { value: 'prediction', label: 'AI Predictions' },
  { value: 'treatment', label: 'Treatments' },
  { value: 'consultation', label: 'Consultations' },
];

const severityOptions = [
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
  { value: 'critical', label: 'Critical' },
];

const HealthFilters: React.FC<HealthFiltersProps> = ({
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleDateRangeChange = (field: 'start' | 'end', date: Date | null) => {
    if (date) {
      onFiltersChange({
        ...filters,
        dateRange: {
          ...filters.dateRange,
          [field]: date,
        },
      });
    }
  };

  const handleEventTypesChange = (event: any) => {
    const value = event.target.value;
    onFiltersChange({
      ...filters,
      eventTypes: typeof value === 'string' ? value.split(',') : value,
    });
  };

  const handleSeverityChange = (event: any) => {
    const value = event.target.value;
    onFiltersChange({
      ...filters,
      severity: typeof value === 'string' ? value.split(',') : value,
    });
  };

  const removeEventType = (eventType: string) => {
    onFiltersChange({
      ...filters,
      eventTypes: filters.eventTypes.filter(type => type !== eventType),
    });
  };

  const removeSeverity = (severity: string) => {
    onFiltersChange({
      ...filters,
      severity: filters.severity?.filter(sev => sev !== severity) || [],
    });
  };

  const hasActiveFilters = () => {
    return (
      filters.eventTypes.length > 0 ||
      (filters.severity && filters.severity.length > 0) ||
      searchTerm.length > 0
    );
  };

  const handleClearAll = () => {
    setSearchTerm('');
    onClearFilters();
  };

  return (
    <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <FilterList />
              <Typography variant="h6">
                Health History Filters
              </Typography>
              {hasActiveFilters() && (
                <Chip
                  label={`${filters.eventTypes.length + (filters.severity?.length || 0)} active`}
                  size="small"
                  color="primary"
                />
              )}
            </Box>
            <IconButton
              onClick={() => setExpanded(!expanded)}
              aria-label="expand filters"
            >
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>

          {/* Quick Search */}
          <Box mb={2}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search in descriptions, symptoms, treatments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Box>

          <Collapse in={expanded}>
            <Box>
              {/* Date Range */}
              <Box mb={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Date Range
                </Typography>
                <Box display="flex" gap={2} flexWrap="wrap">
                  <Typography variant="body2" color="text.secondary">
                    Date Range: Last 1 year (Default filter applied)
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Event Types */}
              <Box mb={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Event Types
                </Typography>
                <FormControl fullWidth size="small">
                  <InputLabel>Select event types</InputLabel>
                  <Select
                    multiple
                    value={filters.eventTypes}
                    onChange={handleEventTypesChange}
                    input={<OutlinedInput label="Select event types" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const option = eventTypeOptions.find(opt => opt.value === value);
                          return (
                            <Chip
                              key={value}
                              label={option?.label || value}
                              size="small"
                              onDelete={() => removeEventType(value)}
                              onMouseDown={(e) => e.stopPropagation()}
                            />
                          );
                        })}
                      </Box>
                    )}
                  >
                    {eventTypeOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Severity Levels */}
              <Box mb={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Severity Levels
                </Typography>
                <FormControl fullWidth size="small">
                  <InputLabel>Select severity levels</InputLabel>
                  <Select
                    multiple
                    value={filters.severity || []}
                    onChange={handleSeverityChange}
                    input={<OutlinedInput label="Select severity levels" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const option = severityOptions.find(opt => opt.value === value);
                          return (
                            <Chip
                              key={value}
                              label={option?.label || value}
                              size="small"
                              color={
                                value === 'critical' || value === 'severe' ? 'error' :
                                value === 'moderate' ? 'warning' : 'success'
                              }
                              onDelete={() => removeSeverity(value)}
                              onMouseDown={(e) => e.stopPropagation()}
                            />
                          );
                        })}
                      </Box>
                    )}
                  >
                    {severityOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        <Chip
                          label={option.label}
                          size="small"
                          color={
                            option.value === 'critical' || option.value === 'severe' ? 'error' :
                            option.value === 'moderate' ? 'warning' : 'success'
                          }
                          variant="outlined"
                        />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Action Buttons */}
              <Box display="flex" gap={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  startIcon={<Clear />}
                  onClick={handleClearAll}
                  disabled={!hasActiveFilters()}
                >
                  Clear All
                </Button>
                <Button
                  variant="contained"
                  onClick={onApplyFilters}
                >
                  Apply Filters
                </Button>
              </Box>
            </Box>
          </Collapse>

          {/* Active Filters Summary */}
          {hasActiveFilters() && !expanded && (
            <Box mt={2}>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                Active Filters:
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {filters.eventTypes.map((type) => {
                  const option = eventTypeOptions.find(opt => opt.value === type);
                  return (
                    <Chip
                      key={type}
                      label={option?.label || type}
                      size="small"
                      onDelete={() => removeEventType(type)}
                    />
                  );
                })}
                {filters.severity?.map((severity) => {
                  const option = severityOptions.find(opt => opt.value === severity);
                  return (
                    <Chip
                      key={severity}
                      label={option?.label || severity}
                      size="small"
                      color={
                        severity === 'critical' || severity === 'severe' ? 'error' :
                        severity === 'moderate' ? 'warning' : 'success'
                      }
                      onDelete={() => removeSeverity(severity)}
                    />
                  );
                })}
                {searchTerm && (
                  <Chip
                    label={`Search: "${searchTerm}"`}
                    size="small"
                    onDelete={() => setSearchTerm('')}
                  />
                )}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
  );
};

export default HealthFilters;