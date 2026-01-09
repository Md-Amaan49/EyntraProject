import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Download,
  PictureAsPdf,
  TableChart,
  Description,
} from '@mui/icons-material';
// Note: DatePicker components will be added when @mui/x-date-pickers is installed
import { cattleAPI } from '../../services/api';
import { Cattle } from '../../types';

interface HealthExportProps {
  cattle: Cattle;
}

const HealthExport: React.FC<HealthExportProps> = ({ cattle }) => {
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv' | 'json'>('pdf');
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({
    start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
    end: new Date(),
  });
  const [includeImages, setIncludeImages] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleExport = async () => {
    if (!dateRange.start || !dateRange.end) {
      setError('Please select both start and end dates.');
      return;
    }

    if (dateRange.start > dateRange.end) {
      setError('Start date must be before end date.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const exportParams = {
        format: exportFormat,
        start_date: dateRange.start.toISOString().split('T')[0],
        end_date: dateRange.end.toISOString().split('T')[0],
        include_images: includeImages,
      };

      const response = await cattleAPI.exportHealthRecord(cattle.id);
      
      // Create blob from response
      const blob = new Blob([response.data], {
        type: getContentType(exportFormat),
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${cattle.identification_number}_health_record_${
        dateRange.start.toISOString().split('T')[0]
      }_to_${dateRange.end.toISOString().split('T')[0]}.${exportFormat}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess(`Health record exported successfully as ${exportFormat.toUpperCase()}`);
    } catch (err: any) {
      console.error('Export failed:', err);
      setError('Failed to export health record. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getContentType = (format: string) => {
    switch (format) {
      case 'pdf':
        return 'application/pdf';
      case 'csv':
        return 'text/csv';
      case 'json':
        return 'application/json';
      default:
        return 'application/octet-stream';
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf':
        return <PictureAsPdf />;
      case 'csv':
        return <TableChart />;
      case 'json':
        return <Description />;
      default:
        return <Download />;
    }
  };

  const getFormatDescription = (format: string) => {
    switch (format) {
      case 'pdf':
        return 'Comprehensive report with charts, images, and detailed analysis. Best for sharing with veterinarians.';
      case 'csv':
        return 'Spreadsheet format with structured data. Good for data analysis and record keeping.';
      case 'json':
        return 'Raw data format with complete information. Suitable for technical users and data processing.';
      default:
        return '';
    }
  };

  return (
    <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Export Health Records
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Export complete health history for {cattle.identification_number} ({cattle.breed})
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Box sx={{ mb: 3 }}>
            <FormControl component="fieldset">
              <FormLabel component="legend">Export Format</FormLabel>
              <RadioGroup
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'pdf' | 'csv' | 'json')}
              >
                <FormControlLabel
                  value="pdf"
                  control={<Radio />}
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <PictureAsPdf />
                      <Box>
                        <Typography variant="body2">PDF Report</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getFormatDescription('pdf')}
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="csv"
                  control={<Radio />}
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <TableChart />
                      <Box>
                        <Typography variant="body2">CSV Spreadsheet</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getFormatDescription('csv')}
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="json"
                  control={<Radio />}
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Description />
                      <Box>
                        <Typography variant="body2">JSON Data</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getFormatDescription('json')}
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
              </RadioGroup>
            </FormControl>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Date Range
            </Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              <Typography variant="body2" color="text.secondary">
                Export Range: Last 1 year (Default)
              </Typography>
            </Box>
          </Box>

          {exportFormat === 'pdf' && (
            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Radio
                    checked={includeImages}
                    onChange={(e) => setIncludeImages(e.target.checked)}
                  />
                }
                label="Include images in PDF report"
              />
              <Typography variant="caption" color="text.secondary" display="block">
                Including images will increase file size but provide complete visual documentation.
              </Typography>
            </Box>
          )}

          <Box display="flex" gap={2} justifyContent="flex-end">
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : getFormatIcon(exportFormat)}
              onClick={handleExport}
              disabled={loading || !dateRange.start || !dateRange.end}
            >
              {loading ? 'Exporting...' : `Export as ${exportFormat.toUpperCase()}`}
            </Button>
          </Box>

          <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
            <Typography variant="caption" color="info.contrastText">
              <strong>Note:</strong> Exported records include all health events, symptom reports, 
              AI predictions, treatments, and consultation notes within the selected date range. 
              Sensitive information is included, so please handle exported files securely.
            </Typography>
          </Box>
        </CardContent>
      </Card>
  );
};

export default HealthExport;