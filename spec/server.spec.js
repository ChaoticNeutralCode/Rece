const request = require('request-promise-native'),
      srv = require('../lib/Server')(),
      urlBase = `http://localhost:${srv.port}`;

srv.start();

describe('Routing', () => {
  it('should route basic requests', () => {
    srv.route('/test', (req, res) => {
      res.setHeader('content-type', 'text/plain');
      res.write('Test Success');
      res.end();
    });

    return request({
      uri: `${urlBase}/test`,
      resolveWithFullResponse: true  
    }).then((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('text/plain');
      expect(res.body).toBe('Test Success');
    });
  });

  it('should allow returning responses from route handlers', () => {
    srv.route('/test2', (req, res) => {
      res.setHeader('content-type', 'text/plain');
      return 'Test Success';
    });

    return request({
      uri: `${urlBase}/test2`,
      resolveWithFullResponse: true  
    }).then((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('text/plain');
      expect(res.body).toBe('Test Success');
    });
  });

  it('should automatically parse JSON request bodies', () => {
    srv.route('/test3', (req, res) => {
      res.setHeader('content-type', 'application/json');
      return JSON.stringify(req.body);
    });

    return request({
      uri: `${urlBase}/test3`,
      json: true,
      body: {message:'Test Success'},
      resolveWithFullResponse: true  
    }).then((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('application/json');
      expect(res.body.message).toBe('Test Success');
    });
  });

  it('should automatically 404', () => {
    return request({
      uri: `${urlBase}/test4`,
      resolveWithFullResponse: true  
    })
    .catch(err => {
      expect(err.response.statusCode).toBe(404);
      expect(err.response.body).toBe('404');
    });
  });
});

describe('Preprocessors', () => {
  it('should add preprocessors before routes, and in order of addition', () => {
    const p1 = (req, res, next) => next(),
          p2 = (req, res, next) => next(),
          p3 = (req, res, next) => next();

    srv.pre(p1);
    srv.pre(p2);
    srv.pre(p3);
    
    expect(srv.chain[0]).toBe(p1);
    expect(srv.chain[1]).toBe(p2);
    expect(srv.chain[2]).toBe(p3);
  });

  it('should execute preprocessors before any routing', () => {
    srv.route('/test5', (req, res) => req.test);
    srv.pre((req, res, next) => {
      req.test = 'Test Success';
      next();
    });

    return request({
      uri: `${urlBase}/test5`,
      resolveWithFullResponse: true  
    }).then((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.body).toBe('Test Success');
    });
  });

  it('should stop the chain if request is handled by a preprocessor', () => {    
    srv.pre((req, res, next) => {
      res.write('Preprocessor');
      res.end();

      next(true);
    });

    return request({
      uri: `${urlBase}/test`,
      resolveWithFullResponse: true  
    }).then((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.body).toBe('Preprocessor');

      srv.chain.splice(4, 1);
    });
  });
});