import { useMediaQuery, useTheme } from '@mui/material';

export const useMobile = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  
  return {
    isMobile,
    isTablet, 
    isDesktop,
    isSmallScreen: isMobile || isTablet,
  };
};

export default useMobile;