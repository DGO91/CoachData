const Nango = require('@nangohq/frontend').default;
try {
  const n = new Nango({ host: 'https://api.nango.dev', connectSessionToken: 'abc' });
  console.log("Success instantiating!");
} catch(e) {
  console.log("Error instantiating:", e.message);
}
