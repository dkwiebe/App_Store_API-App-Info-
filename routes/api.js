const Express = require('express');
const app_store = require('app-store-scraper');
const path = require('path');
const qs = require('querystring');

const router = Express.Router();

const toList = (apps) => ({ results: apps });

const cleanUrls = (req) => (app) => Object.assign({}, app, {
  playstoreUrl: app.url,
  url: buildUrl(req, 'apps/' + app.appId),
  permissions: buildUrl(req, 'apps/' + app.appId + '/permissions'),
  similar: buildUrl(req, 'apps/' + app.appId + '/similar'),
  reviews: buildUrl(req, 'apps/' + app.appId + '/reviews'),
  developer: {
    devId: app.developer,
    url: buildUrl(req, 'developers/' + qs.escape(app.developer))
  }
});

const buildUrl = (req, subpath) =>
  req.protocol + '://' + path.join(req.get('host'), req.baseUrl, subpath);

/* 
  Index : GET /api/
  Display apps and developers url
*/
router.get('/', (req, res) =>
  res.json({
    apps: buildUrl(req, 'apps')
  })
);

/* 
  Search : GET /api/apps/?q=
  Query : https://github.com/facundoolano/app-store-scraper#search
*/
router.get('/apps/', function (req, res, next) {

  if (!req.query.q) {
    return next();
  }

  const opts = Object.assign({ term: req.query.q }, req.query);

  app_store.search(opts)
    .then((apps) => apps.map(cleanUrls(req)))
    .then(toList)
    .then(res.json.bind(res))
    .catch(next);
});

/* 
  Suggest : GET /api/apps/?suggest=
  Query : https://github.com/facundoolano/app-store-scraper#suggest
*/
router.get('/apps/', function (req, res, next) {

  if (!req.query.suggest) {
    return next();
  }

  const toJSON = (term) => ({
    term,
    url: buildUrl(req, '/apps/') + '?' + qs.stringify({ q: term })
  });

  app_store.suggest({ term: req.query.suggest })
    .then((terms) => terms.map(toJSON))
    .then(toList)
    .then(res.json.bind(res))
    .catch(next);
});

/* 
  List : GET /api/apps/
  Query : https://github.com/facundoolano/app-store-scraper#list
*/
router.get('/apps/', function (req, res, next) {

  app_store.list(req.query)
    .then((apps) => apps.map(cleanUrls(req)))
    .then(toList)
    .then(res.json.bind(res))
    .catch(next);
});

/* 
  App : GET /api/apps/:appId
  Query : https://github.com/facundoolano/app-store-scraper#app
*/
router.get('/apps/:appId', function (req, res, next) {

  const opts = Object.assign({ appId: req.params.appId }, req.query);
  app_store.app(opts)
    .then(cleanUrls(req))
    .then(res.json.bind(res))
    .catch(next);
});

/* 
  Similar : GET /api/apps/:appId/similar
  Query : https://github.com/facundoolano/app-store-scraper#similar
*/
router.get('/apps/:appId/similar', function (req, res, next) {

  const opts = Object.assign({ appId: req.params.appId }, req.query);
  app_store.similar(opts)
    .then((apps) => apps.map(cleanUrls(req)))
    .then(toList)
    .then(res.json.bind(res))
    .catch(next);
});

/* 
  Reviews : GET /api/apps/:appId/reviews
  Query : https://github.com/facundoolano/app-store-scraper#reviews
*/
router.get('/apps/:appId/reviews', function (req, res, next) {
  function paginate(apps) {
    const page = parseInt(req.query.page || '0');

    const subpath = '/apps/' + req.params.appId + '/reviews/';
    if (page > 0) {
      req.query.page = page - 1;
      apps.prev = buildUrl(req, subpath) + '?' + qs.stringify(req.query);
    }

    if (apps.results.length) {
      req.query.page = page + 1;
      apps.next = buildUrl(req, subpath) + '?' + qs.stringify(req.query);
    }

    return apps;
  }

  const opts = Object.assign({ appId: req.params.appId }, req.query);
  app_store.reviews(opts)
    .then(toList)
    .then(paginate)
    .then(res.json.bind(res))
    .catch(next);
});

function errorHandler(err, req, res, next) {
  res.status(400).json({ message: err.message });
  next();
}

router.use(errorHandler);

module.exports = router;