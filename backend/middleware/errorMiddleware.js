const multer = require("multer");

// Return safe JSON for parser/upload failures rather than Express's HTML error page.
function errorMiddleware(error, _req, res, next) {
  if (res.headersSent) return next(error);
  if (error instanceof multer.MulterError) {
    return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
      success: false,
      message: error.code === "LIMIT_FILE_SIZE" ? "Image must be 5 MB or smaller" : "Invalid upload: use one image and the supported product fields",
    });
  }
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Invalid JSON request body" });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "Request body is too large" });
  }
  if (error.status === 400 && error.message === "Upload a JPEG, PNG, WebP or GIF image") {
    return res.status(400).json({ success: false, message: error.message });
  }
  return res.status(500).json({ success: false, message: "Unexpected server error" });
}

module.exports = errorMiddleware;
