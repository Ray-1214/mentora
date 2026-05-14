import React from 'react';

const Loader = ({ message = 'Loading…' }) => (
  <div className="app-shell">
    <div className="loader-wrap">
      <div className="loader-dots">
        <span /><span /><span />
      </div>
      <p className="loader-text">{message}</p>
    </div>
  </div>
);

export default Loader;
