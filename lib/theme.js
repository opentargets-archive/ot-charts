const PRIMARY = '#0091eb';
const SECONDARY = '#ff6350';
const GREY = {
  50: '#fafafa',
  100: '#f5f5f5',
  200: '#eeeeee',
  300: '#e0e0e0',
  400: '#bdbdbd',
  500: '#9e9e9e',
  600: '#757575',
  700: '#616161',
  800: '#424242',
  900: '#212121',
  A100: '#d5d5d5',
  A200: '#aaaaaa',
  A400: '#303030',
  A700: '#616161',
};

const theme = {
  primary: PRIMARY,
  secondary: SECONDARY,
  axis: {
    color: GREY[600],
    highlightColor: GREY[200],
  },
  point: {
    radius: 3,
    color: GREY[600],
    highlightColor: PRIMARY,
  },
  line: {
    thickness: 2,
    color: GREY[600],
    highlightColor: PRIMARY,
  },
  connector: {
    color: GREY[300],
    finemappingColor: GREY[500],
  },
  track: {
    background: GREY[200],
  },
  margin: {
    top: 50,
    bottom: 80,
    left: 80,
    right: 50,
  },
};

export default theme;
