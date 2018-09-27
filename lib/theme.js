import { lighten, darken, desaturate, tint, shade } from 'polished';

const PRIMARY = '#0091eb';
const SECONDARY = '#ff6350';
const TERTIARY = '#00a252';
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
  grey: GREY,
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
    backgroundAlternate: GREY[100],
  },
  gecko: {
    color: GREY[500],
    backgroundColor: 'white',
    colorSelected: PRIMARY,
    backgroundColorSelected: 'white',
    colorChained: SECONDARY,
    backgroundColorChained: 'white',
    connectorColor: GREY[300],
    connectorColorSelected: lighten(0.2, PRIMARY),
    connectorColorChained: lighten(0.2, SECONDARY),
    finemappingConnectorColor: GREY[400],
    finemappingConnectorColorSelected: lighten(0.05, PRIMARY),
    finemappingConnectorColorChained: lighten(0.05, SECONDARY),
    legend: GREY[100],
  },
  margin: {
    top: 50,
    bottom: 80,
    left: 80,
    right: 50,
  },
};

export default theme;
