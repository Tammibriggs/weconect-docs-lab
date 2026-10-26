const mongoose = require("mongoose");

// An API key lets a developer's code call the public endpoints as its owner.
// Only a SHA-256 hash of the key is stored; the key itself is shown once,
// when it's created.
const ApiKeySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: 50,
    },
    hash: {
      type: String,
      required: true,
      unique: true,
    },
    // The last four characters, so people can tell their keys apart
    lastFour: {
      type: String,
      required: true,
    },
    scopes: {
      type: [String],
      enum: ["read", "write"],
      required: true,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ApiKey", ApiKeySchema);
