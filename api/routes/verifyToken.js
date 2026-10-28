const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const ApiKey = require('../models/ApiKey')

// API keys start with this prefix, so they can't be mistaken for access tokens
const API_KEY_PREFIX = 'wck_'

const hashApiKey = (key) => crypto.createHash('sha256').update(key).digest('hex')

const tokenFrom = (req) => {
  const authHeader = req.headers.authorization
  return authHeader ? authHeader.split(' ')[1] : undefined
}

// checking for validity of token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization
  if(authHeader){
    const token = authHeader.split(' ')[1]
    // API keys work only on the public endpoints, which use verifyTokenOrApiKey
    if (typeof token === 'string' && token.startsWith(API_KEY_PREFIX)) {
      return res.status(403).json({status: 'error', message: 'API keys can\'t be used with this endpoint. Use an access token from logging in.'})
    }
    // decode() returns null for anything that isn't a JWT (finding 7)
    const exp = jwt.decode(token)?.exp
    if(!exp) return res.status(403).json({status: 'error', message: 'Token is invalid'})
    if (Date.now() >= exp * 1000) return res.status(403).json({status:'error', expired: true, message: 'Your session has expired'})
    jwt.verify(token, process.env.JWT_SECT, (err, user) => {
      if(err) return res.status(403).json({status: 'error', message: 'Token is invalid'})
      req.user = user
      next()
    })
  }else{
    return res.status(401).json({status: 'error', message:'You are not authenticated!'})
  }
}

// For the public endpoints: accepts an API key with the given scope ("read" or
// "write"), or an access token from logging in, which the app uses.
// Not async on purpose: Express 4 turns a synchronous throw into a 500 but lets
// a rejected promise crash the server.
const verifyTokenOrApiKey = (scope) => (req, res, next) => {
  const token = tokenFrom(req)
  if (typeof token !== 'string' || !token.startsWith(API_KEY_PREFIX)) {
    // Neither an API key nor an access token, such as a key without its prefix or
    // without "Bearer ": answer as for any other wrong key
    if (req.headers.authorization && !jwt.decode(token)) {
      return res.status(401).json({status: 'error', message: 'Invalid API key'})
    }
    return verifyToken(req, res, next)
  }
  checkApiKey(token, scope, req, res, next)
}

const checkApiKey = async (token, scope, req, res, next) => {
  let apiKey
  try {
    apiKey = await ApiKey.findOne({ hash: hashApiKey(token) })
  } catch (err) {
    return res.status(500).json({status: 'error', message: 'Unable to check the API key'})
  }
  if (!apiKey) {
    return res.status(401).json({status: 'error', message: 'Invalid API key'})
  }
  if (!apiKey.scopes.includes(scope)) {
    return res.status(403).json({status: 'error', message: `This API key doesn't have the '${scope}' scope`})
  }
  // Not awaited: recording the last use shouldn't slow the request down
  ApiKey.updateOne({ _id: apiKey._id }, { lastUsedAt: new Date() }).catch(() => {})
  req.user = { id: apiKey.userId }
  req.apiKey = { id: apiKey._id.toString(), scopes: apiKey.scopes }
  next()
}

// Authorizing actions for verified users and admins
const verifyTokenAndAuthorization = (req, res, next) => {
  verifyToken(req, res, () => {
    if(req.user.id === req.params.id){
      next()
    }else{
      res.status(403).json({status: 'error', message: 'Operation not allowed!'})
    }
  })
}


module.exports = {verifyToken, verifyTokenOrApiKey, verifyTokenAndAuthorization, hashApiKey, API_KEY_PREFIX}
