#!/usr/bin/env node
// scripts/check-migration-governance.js
// Automated SQL Migration Governance Checker for CoachData Operational OS v2

const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '../supabase/migrations');

function auditMigrations() {
  console.log("=== INICIANDO AUDITORÍA DE GOBERNANZA DE MIGRACIONES SQL ===");
  
  if (!fs.existsSync(migrationsDir)) {
    console.error("❌ Error: No existe el directorio supabase/migrations");
    process.exit(1);
  }

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  let errors = 0;
  let warnings = 0;

  console.log(`📁 Total de archivos de migración detectados: ${files.length}\n`);

  const numbers = [];

  files.forEach((file, index) => {
    console.log(`[${index + 1}/${files.length}] Auditando: ${file}`);
    
    // Check 1: Naming format NNN_snake_case.sql
    const match = file.match(/^(\d{3})_([a-z0-9_]+)\.sql$/);
    if (!match) {
      console.error(`  ❌ Error de Nombre: '${file}' no sigue el formato canónico NNN_snake_case.sql`);
      errors++;
    } else {
      const num = parseInt(match[1], 10);
      numbers.push(num);
    }

    // Read content
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

    // Check 2: Empty migrations
    if (!content.trim()) {
      console.error(`  ❌ Error: '${file}' es un archivo de migración vacío.`);
      errors++;
    }

    // Check 3: Header comment block
    if (!content.includes('-- Purpose:') && !content.includes('-- ====================================================================')) {
      console.warn(`  ⚠️ advertencia: '${file}' no incluye el bloque de encabezado formal.`);
      warnings++;
    }

    // Check 4: Anti-pattern FOR ALL in policies
    if (/\bFOR\s+ALL\b/i.test(content)) {
      console.error(`  ❌ Error de RLS: '${file}' contiene 'FOR ALL' en lugar de políticas separadas por operación (SELECT, INSERT, UPDATE, DELETE).`);
      errors++;
    }
  });

  // Check 5: Duplicate or missing sequential numbers
  for (let i = 0; i < numbers.length; i++) {
    const expected = i + 1;
    if (numbers[i] !== expected) {
      console.error(`  ❌ Error de Secuencia: Número de migración fuera de orden. Esperado ${expected.toString().padStart(3, '0')}, encontrado ${numbers[i].toString().padStart(3, '0')}`);
      errors++;
    }
  }

  console.log("\n====================================================");
  if (errors === 0) {
    console.log("✅ AUDITORÍA COMPLETADA CON ÉXITO: 0 Errores de Gobernanza SQL.");
    if (warnings > 0) console.log(`   (${warnings} Advertencias menores detectadas)`);
    process.exit(0);
  } else {
    console.error(`❌ AUDITORÍA FALLIDA: Se detectaron ${errors} errores críticos de gobernanza SQL.`);
    process.exit(1);
  }
}

auditMigrations();
