import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ROOT_ID } from './constants';

let root = document.getElementById(ROOT_ID);
if (!root) {
  root = document.createElement('div');
  root.id = ROOT_ID;
  document.body.appendChild(root);
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);