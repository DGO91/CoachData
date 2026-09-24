import React from 'react';
import { renderToString } from 'react-dom/server';
import EveningSummary from './src/components/EveningSummary.jsx';

try {
  const html = renderToString(<EveningSummary language="es" />);
  console.log("RENDER SUCCESS. HTML length:", html.length);
} catch (err) {
  console.error("RENDER ERROR:", err);
}
