const request = require('request-promise-native'),
      srv = require('../index')(),
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
      return 'Test 2 Success';
    });

    return request({
      uri: `${urlBase}/test2`,
      resolveWithFullResponse: true  
    }).then((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('text/plain');
      expect(res.body).toBe('Test 2 Success');
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
      body: {message:'Test 3 Success'},
      resolveWithFullResponse: true  
    }).then((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('application/json');
      expect(res.body.message).toBe('Test 3 Success');
    });
  });

  it('should automatically 404', () => {
    return request({
      uri: `${urlBase}/test4`,
      resolveWithFullResponse: true  
    }).catch(err => {
      expect(err.response.statusCode).toBe(404);
      expect(err.response.body).toBe('404');
    });
  });

  it('should allow loading of previously recreated routes', () => {
    srv.route(require('./test.route'));

    return request({
      uri: `${urlBase}/test6`,
      resolveWithFullResponse: true  
    }).then((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.body).toBe('Test 6 Success');
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
    
    expect(srv.chain[1]).toBe(p1);
    expect(srv.chain[2]).toBe(p2);
    expect(srv.chain[3]).toBe(p3);
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

describe('Static Files', () => {
  srv.serve(__dirname, 'public');

  it('should serve html files', () => {
    return request({
      uri: `${urlBase}/test.html`,
      resolveWithFullResponse: true  
    }).then((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('text/html');
      expect(res.body).toBe('<h1>Test Success</h1>');
    });
  });

  it('should serve an index HTML file', () => {
    return request({
      uri: `${urlBase}/`,
      resolveWithFullResponse: true  
    }).then((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('text/html');
      expect(res.body).toBe('<h1>Index Page</h1>');
    });
  });

  it('should serve css files', () => {
    return request({
      uri: `${urlBase}/css/test.css`,
      resolveWithFullResponse: true  
    }).then((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('text/css');
      expect(res.body).toBe('body { color: white; }');
    });
  });

  it('should serve js files', () => {
    return request({
      uri: `${urlBase}/js/test.js`,
      resolveWithFullResponse: true  
    }).then((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('text/javascript');
      expect(res.body).toBe("const test = 'Success';");
    });
  });
});

