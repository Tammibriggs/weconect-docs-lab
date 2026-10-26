const router = require("express").Router();
const crypto = require("crypto");
const mongoose = require("mongoose");
const ApiKey = require("../models/ApiKey");
const { verifyToken, hashApiKey, API_KEY_PREFIX } = require("./verifyToken");

// Internal: used by the app's API keys page. These endpoints accept only an
// access token from logging in, never an API key, so a leaked key can't be
// used to create more keys.

const SCOPES = ["read", "write"];

// What the API returns about a key. The key itself is never returned again.
const describe = (apiKey) => ({
  id: apiKey._id,
  name: apiKey.name,
  lastFour: apiKey.lastFour,
  scopes: apiKey.scopes,
  createdAt: apiKey.createdAt,
  lastUsedAt: apiKey.lastUsedAt,
});

const validateKeyRequest = (req, res, next) => {
  const { name, scopes } = req.body;
  if (typeof name !== "string" || !name.trim() || name.trim().length > 50) {
    return res.status(400).json({ status: "error", message: "name must be a string of 1 to 50 characters" });
  }
  if (
    !Array.isArray(scopes) ||
    scopes.length === 0 ||
    !scopes.every((scope) => SCOPES.includes(scope)) ||
    new Set(scopes).size !== scopes.length
  ) {
    return res.status(400).json({ status: "error", message: "scopes must be a list of one or both of: read, write" });
  }
  next();
};

// create a key
router.post("/", verifyToken, validateKeyRequest, async (req, res) => {
  try {
    const key = API_KEY_PREFIX + crypto.randomBytes(24).toString("base64url");
    const apiKey = await ApiKey.create({
      userId: req.user.id,
      name: req.body.name.trim(),
      hash: hashApiKey(key),
      lastFour: key.slice(-4),
      scopes: SCOPES.filter((scope) => req.body.scopes.includes(scope)),
    });
    res.status(201).json({ status: "ok", data: { ...describe(apiKey), key } });
  } catch (err) {
    res.status(500).json({ status: "error", message: "Unable to create the API key" });
  }
});

// list your keys, newest first
router.get("/", verifyToken, async (req, res) => {
  try {
    const keys = await ApiKey.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ status: "ok", data: keys.map(describe) });
  } catch (err) {
    res.status(500).json({ status: "error", message: "Unable to list API keys" });
  }
});

// delete (revoke) one of your keys; it stops working at once
router.delete("/:keyId", verifyToken, async (req, res) => {
  const notFound = () => res.status(404).json({ status: "error", message: "API key not found" });
  if (!mongoose.Types.ObjectId.isValid(req.params.keyId)) return notFound();
  try {
    const deleted = await ApiKey.findOneAndDelete({ _id: req.params.keyId, userId: req.user.id });
    if (!deleted) return notFound();
    res.status(200).json({ status: "ok" });
  } catch (err) {
    res.status(500).json({ status: "error", message: "Unable to delete the API key" });
  }
});

module.exports = router;
