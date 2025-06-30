const basicAuth = require('express-basic-auth');

module.exports = (req, res, next) => {
  // Get config from app
  const config = req.app.locals.config;
  
  if (!config || !config.get('agent.authentication.enabled')) {
    return next();
  }
  
  const username = config.get('agent.authentication.username');
  const password = config.get('agent.authentication.password');
  
  const authMiddleware = basicAuth({
    users: { [username]: password },
    challenge: true,
    realm: 'LexOS Monitoring Agent'
  });
  
  return authMiddleware(req, res, next);
};