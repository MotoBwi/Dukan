const crypto = require('crypto');

const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const SYMBOLS = '@#$%*+=?';

const pick = (set) => set[crypto.randomInt(set.length)];

/** Random password with at least one lowercase, uppercase, digit and symbol (ambiguous characters left out). */
function generatePassword(length = 16) {
  const chars = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  const all = LOWER + UPPER + DIGITS + SYMBOLS;
  while (chars.length < length) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

module.exports = { generatePassword };
