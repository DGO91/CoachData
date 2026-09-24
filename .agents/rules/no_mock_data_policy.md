# No Mock Data & Empty State Policy

1. **Cero Datos Ficticios**: Se prohíbe el uso de datos de prueba o cadenas hardcodeadas (`John Doe`, `Acme Inc`, `Nova Consulting` por defecto, fallbacks fijos `1`).
2. **Evaluación Estricta de Arreglos Vacíos**: Si un arreglo de Supabase o Postgres está vacío (`length === 0`), se debe renderizar obligatoriamente un componente `<EmptyState />` canónico.
