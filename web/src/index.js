import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import { RouterProvider } from "react-router-dom"
import { Provider } from 'react-redux'
import {store} from './redux/store'
import { router } from './router'
import { ToastProvider } from './components/ui/Toast'

const root = ReactDOM.createRoot(document.getElementById('root'));
// StrictMode runs effects twice in development, which catches effects that don't clean up.
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </Provider>
  </React.StrictMode>
);
