require('./env');

module.exports = {
  name: process.env.SHOP_NAME || 'YOUR SHOP NAME',
  address: process.env.SHOP_ADDRESS || 'Shop address, City',
  phone: process.env.SHOP_PHONE || '',
  gstin: process.env.SHOP_GSTIN || '',
  terms: process.env.SHOP_TERMS || 'Thank you for your business!',
};
