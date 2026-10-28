const multer = require("multer");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 10, fieldSize: 64 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype)) {
      return callback(Object.assign(new Error("Upload a JPEG, PNG, WebP or GIF image"), { status: 400 }));
    }
    callback(null, true);
  },
});

module.exports = upload;
