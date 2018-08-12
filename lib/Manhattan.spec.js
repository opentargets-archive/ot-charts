import React from 'react';
import { shallow } from 'enzyme';

import Manhattan from './Manhattan';

it('renders without crashing (shallow)', () => {
  shallow(<Manhattan />);
});
