require('dotenv').config();
const { decrypt } = require('./src/utils/encryption');

try {
  const result = decrypt('adeff043140e9f163352efed:ad7a58f23d0930247bc6ab9a190fcb91:37f602afcbbdc397c17b5e');
  console.log("Decrypted:", result);
} catch (err) {
  console.error("Error decrypting:", err);
}
