const jwt = require("jsonwebtoken");
const User = require("../models/User");


const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Not authorized, token missing",
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.userId = decoded.id;
        req.user = await User.findById(decoded.id).select("-password");
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Not authorized, user not found",
            });
        }
        if (!req.user.isActive) {
            return res.status(401).json({
                success: false,
                message: "Account is inactive",
            });
        }
    next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Not authorized, invalid or expired token",
        });
    }

};
const authorize = (...roles) => {
    return (req, res, next) => {
        // check req.user.role here
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to access this resource",
            });
        }
        next();
    };
};
module.exports = { protect, authorize };