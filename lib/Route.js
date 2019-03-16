const METHODS = require('http').METHODS;

class Route {
  static get METHODS() { return METHODS }

  constructor(path, handlersToAdd) {
    this.handlers = {};
    this.path =  path;
    this.params = [];

    // Converts any colon-based param (:myParam) definitions to 
    // regular expression-based, to make param processing easier later.
    if(typeof path === 'string' && path.includes(':')) {
      let parts = path.split('/');
  
      this.path = new RegExp(parts.map(part => {
        if(part.startsWith(':')) {
          this.params.push(part.substr(1));
          return '(.+)';
        } else {
          return part;
        }
      }).join('/'));
    }

    // Create the HTTP method-specific methods
    Route.METHODS.forEach(method => {
      this[method] = this[method.toLowerCase()] = 
        this.handle.bind(this, method);
    });

    if(typeof handlersToAdd === 'object') {
      for(const h in handlersToAdd) {
        if(typeof this[h] === 'function') {
          this[h](handlersToAdd[h])
        }
      }
    } else if(typeof handlersToAdd === 'function') {
      this.get(handlersToAdd);
    }
  }

  handle(method, handler) {
    this.handlers[method.toUpperCase()] = handler;
  }

  run(req, res) {
    if(!this.handlers.hasOwnProperty(req.method) || res.finished) {
      return false;
    }

    if(this.path instanceof RegExp && this.path.test(req.path)) {
      const values = this.path.exec(req.path);
      values.splice(0, 1); //remove the "full string" first match

      if(this.params.length) {
        req.params = req.params || {};

        values.forEach((value, idx) => {
          req.params[this.params[idx]] =  (isNaN(value) ? value : Number(value));
        });
      } else {
        req.params = params;
      }
    } else if(this.path !== req.path) {
      return false;
    }

    return this.handlers[req.method](req, res) || true;
  }
}

module.exports = Route;