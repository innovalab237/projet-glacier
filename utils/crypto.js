import CryptoJS from 'crypto-js';

export const encrypt = (data) => {
  return CryptoJS.AES.encrypt(
    JSON.stringify(data),
    process.env.RFID_ENCRYPTION_KEY,
    { iv: process.env.RFID_IV }
  ).toString();
};

export const decrypt = (ciphertext) => {
  const bytes = CryptoJS.AES.decrypt(
    ciphertext,
    process.env.RFID_ENCRYPTION_KEY,
    { iv: process.env.RFID_IV }
  );
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};

// Pour les soldes RFID
export const encryptBalance = (amount) => {
  return encrypt({ value: amount, timestamp: Date.now() });
};

export const decryptBalance = (encrypted) => {
  const data = decrypt(encrypted);
  return data.value;
};