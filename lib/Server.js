const path = require('path'),
      http = require('http'),
      url = require('url'),
      Route = require('./Route');

const BODY_PROCESSORS = {
  'application/json': body => JSON.parse(body)
};

class Server {
  constructor(port = 18535) {
    this.port = port;
    this.chain = [];

    this.server = http.createServer();
  }

  onRequest(req, res) {
    let parsedURL = url.parse(req.url, true);
    
    req.path = parsedURL.pathname;
    req.query = parsedURL.query;
    req.body = '';

    req.on('data', data => {
      req.body += data;
      
      //data overflow protection
      if (req.body.length > 1e6) { 
        req.connection.destroy();
      }
    });

    req.on('end', () => {
      if(typeof BODY_PROCESSORS[req.headers['content-type']] === 'function') {
        req.body = BODY_PROCESSORS[req.headers['content-type']](req.body);
      }

      this.run(req, res, handled => {
        if(!handled) {
          res.setHeader('Content-Type', 'text/plain');
          res.statusCode = 404;
          res.write('404');
          res.end();
        }
      });
    });
  }

  run(req, res, done, linkNum = 0) {
    if(!this.chain[linkNum]) {
      done(false);
    }

    const link = this.chain[linkNum];

    if(link instanceof Route) {
      const re = link.run(req, res);

      if(re) {
        if(typeof re !== 'boolean') {
          res.write(re);
          res.end();
        }

        done(true);
      } else {
        this.run(req, res, done, ++linkNum);
      }      
    } else if(typeof link === 'function') {
      link(req, res, handled => {
        if(handled) {
          return done(true);
        }

        this.run(req, res, done, ++linkNum);
      });
    }
  }

  route(path, handlersToAdd) {
    const r = new Route(path, handlersToAdd);
    this.chain.push(r);

    return r;
  }

  pre(processor) {
    this.chain.splice(
      this.chain.findIndex(link => link instanceof Route),
      0,
      processor
    );
  }

  start() {
    this.server.on('request', this.onRequest.bind(this));

    this.server.listen(this.port, () => {
      console.log(`Server listening on port ${this.port}.`);
    });
  }
}

module.exports = function(port) {
  return new Server(port);
}