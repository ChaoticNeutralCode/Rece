const Route = require('../lib/Route.js');

describe('Route Paths', () => {
  it('should passthrough non-parameterized paths', () => {
    const p = '/test/test/test';
    expect(new Route(p).path).toBe(p);
  });

  it('should change colon-params to regex params', () => {
    const r = new Route('/test/:param/test');
    expect(r.path).toEqual(jasmine.any(RegExp));
    expect(r.path.toString()).toBe('/\\/test\\/(.+)\\/test/');
    expect(r.params[0]).toBe('param');
  });
});

describe('Route Handlers', () => {

  it('should have method methods, both upper and lowercase', () => {
    const r = new Route();

    Route.METHODS.forEach(method => {
      expect(r[method]).toEqual(jasmine.any(Function));
      expect(r[method.toLowerCase()]).toEqual(jasmine.any(Function));
    });
  });

  it('should add handlers based on the method used', () => {
    const r = new Route(),
          h = () => {}, h2 = () => {};

    r.get(h);
    expect(r.handlers['GET']).toBe(h);

    r.post(h2);
    expect(r.handlers['POST']).toBe(h2);
  });

  it('should be able to add handled during route creation', () => {
    const g = () => {}, 
          p = () => {},
          r = new Route('/test', {
            get: g,
            post: p
          });
      
    expect(r.handlers).toEqual({
      'GET': g,
      'POST': p
    });
  });

  it('should be able to add a get handler during route creation', () => {
    const g = () => {}, 
          r = new Route('/test', g);
      
    expect(r.handlers).toEqual({
      'GET': g
    });
  });

  it('should allow chaining of handler addition', () => {
    const g = () => {}, 
          p = () => {},
          r = new Route('/test');
    
    r.get(g).post(p);
      
    expect(r.handlers).toEqual({
      'GET': g,
      'POST': p
    });
  });

  it('should not execute if path does not match', () => {
    const r = new Route('/test'),
          h = jasmine.createSpy('h');

    r.get(h);
    r.run({
      method: 'GET',
      path: '/nottest'
    }, {});

    expect(h).not.toHaveBeenCalled();
  });

  it('should execute handler if path does match', () => {
    const r = new Route('/test'),
          h = jasmine.createSpy('h');

    r.get(h);
    r.run({
      method: 'GET',
      path: '/test'
    }, {});

    expect(h).toHaveBeenCalled();
  });

  it('should match and parse route params when set', () => {
    const r = new Route('/test/:myParam/test'),
          h = req => {
            expect(req.params.myParam).toBe(5);
          };

    r.get(h);
    r.run({
      method: 'GET',
      path: '/test/5/test'
    }, {});
  });
});