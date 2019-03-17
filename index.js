const Server = require('./lib/Server'),
      Route = require('./lib/Route');

module.exports = Rece = function(port) {
  return new Server(port);
};

Rece.Server = Server;
Rece.Route = Route;
