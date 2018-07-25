import React from 'react';

// TODO: Eventually remove this

const ChartPlaceholder = ({ children }) => (
    <div style={{ backgroundColor: 'lightgrey', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        {children}
    </div>
);

export default ChartPlaceholder;
