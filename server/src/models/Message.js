const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ⭐ text optional (media messages can be empty text)
    text: {
      type: String,
      trim: true,
      default: "",
    },

    // ⭐ message type system
    type: {
      type: String,
      enum: ["text", "image", "video", "audio", "file"],
      default: "text",
    },

    // ⭐ media support
    fileUrl: {
      type: String,
      default: null,
    },

    fileName: {
      type: String,
      default: null,
    },

    fileSize: {
      type: Number,
      default: null,
    },

    // ⭐ DELIVERY STATUS (✔)
    delivered: {
      status: {
        type: Boolean,
        default: false,
      },
      at: {
        type: Date,
        default: null,
      },
    },

    // ⭐ SEEN STATUS (✔✔)
    seen: {
      status: {
        type: Boolean,
        default: false,
      },
      at: {
        type: Date,
        default: null,
      },
    },
    
    // ⭐ DELETE FOR ME SUPPORT
    deletedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);