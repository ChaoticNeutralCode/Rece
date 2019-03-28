const fs = require('fs'),
      path = require('path'),
      request = require('request-promise-native'),
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
    
    expect(srv.chain[2]).toBe(p1);
    expect(srv.chain[3]).toBe(p2);
    expect(srv.chain[4]).toBe(p3);
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
  srv.serve('/single/file', __dirname, 'single.html');

  it('should be able to serve single files', () => {
    return request({
      uri: `${urlBase}/single/file`,
      resolveWithFullResponse: true  
    }).then((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('text/html');
      expect(res.body).toBe('<h1>Im Single!</h1>');
    });
  });

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

  it('should serve json files', () => {
    return request({
      uri: `${urlBase}/manifest.json`,
      resolveWithFullResponse: true  
    }).then((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('application/json');
      expect(res.body).toBe('{\r\n  "test": "success"\r\n}');
    });
  });

  function getFile(...pathPieces) {
    return fs.readFileSync(
      path.join(__dirname, ...pathPieces)
    ).toString();
  }

  function getImage(extname) {
    return getFile('public', 'img', `image.${extname}`);
  }

  function getVideo(extname) {
    return getFile('public', 'video', `video.${extname}`);
  }

  function getAudio(extname) {
    return getFile('public', 'audio', `audio.${extname}`);
  }
  function getFont(extname) {
    return getFile('public', 'fonts', `font.${extname}`);
  }

  it('should serve common image files', () => {
    return request({
      uri: `${urlBase}/img/image.png`,
      resolveWithFullResponse: true  
    })
    .then((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('image/png');
      expect(res.body).toBe(getImage('png'));

      return request({
        uri: `${urlBase}/img/image.svg`,
        resolveWithFullResponse: true  
      });
    })
    .then((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('image/svg+xml');
      expect(res.body).toBe(getImage('svg'));

      return request({
        uri: `${urlBase}/img/image.jpg`,
        resolveWithFullResponse: true  
      });
    })
    .then((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('image/jpeg');
      expect(res.body).toBe(getImage('jpg'));

      return request({
        uri: `${urlBase}/img/image.gif`,
        resolveWithFullResponse: true  
      });
    })
    .then((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('image/gif');
      expect(res.body).toBe(getImage('gif'));
    });
  });

  it('should serve common video files', () => {
    return request({
      uri: `${urlBase}/video/video.mp4`,
      resolveWithFullResponse: true
    })
    .then((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('video/mp4');
      expect(res.body).toBe(getVideo('mp4'));
    });
  });

  it('should serve common audio files', () => {
    return request({
      uri: `${urlBase}/audio/audio.mp3`,
      resolveWithFullResponse: true
    })
    .then((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('audio/mpeg');
      expect(res.body).toBe(getAudio('mp3'));

      return request({
        uri: `${urlBase}/audio/audio.wav`,
        resolveWithFullResponse: true  
      });
    })
    .then((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('audio/wav');
      expect(res.body).toBe(getAudio('wav'));
    });
  });

  it('should serve common font files', () => {
    return request({
      uri: `${urlBase}/fonts/font.eot`,
      resolveWithFullResponse: true
    })
    .then((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('application/vnd.ms-fontobject');
      expect(res.body).toBe(getFont('eot'));

      return request({
        uri: `${urlBase}/fonts/font.otf`,
        resolveWithFullResponse: true  
      });
    })
    .then((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('font/otf');
      expect(res.body).toBe(getFont('otf'));

      return request({
        uri: `${urlBase}/fonts/font.otf`,
        resolveWithFullResponse: true  
      });
    })
    .then((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('font/otf');
      expect(res.body).toBe(getFont('otf'));

      return request({
        uri: `${urlBase}/fonts/font.ttf`,
        resolveWithFullResponse: true  
      });
    })
    .then((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('font/ttf');
      expect(res.body).toBe(getFont('ttf'));

      return request({
        uri: `${urlBase}/fonts/font.woff`,
        resolveWithFullResponse: true  
      });
    })
    .then((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('font/woff');
      expect(res.body).toBe(getFont('woff'));

      return request({
        uri: `${urlBase}/fonts/font.woff2`,
        resolveWithFullResponse: true  
      });
    })
    .then((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('font/woff2');
      expect(res.body).toBe(getFont('woff2'));
    });
  });
});

