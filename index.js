const dns = require('dns');

const originalLookup = dns.lookup;
dns.lookup = function (hostname, options, callback) {
  // if (hostname === 'api.open-meteo.com') {
  //   const targetCallback = typeof options === 'function' ? options : callback;
  //   return targetCallback(null, '188.40.99.226', 4); 
  // }
  return originalLookup.apply(this, arguments);
};

require('dotenv').config();
const Server = require('./models/server');

const server = new Server();

server.listen();