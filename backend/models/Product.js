const moongose = require("mongoose");

const productSchema = new moongose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
            validate: { validator: Number.isFinite, message: "Price must be finite" },
        },
        unit: {
            type: String,
            required: true,
            enum: ["kg", "gram", "dozen", "liter", "piece"],
        },
        quantity: {
            type: Number,
            required: true,
            min: 0,
            validate: { validator: Number.isFinite, message: "Quantity must be finite" },
        },
        category: {
            type: String,
            required: true,
            enum: ["vegetables", "fruits", "grains", "dairy", "other"],
        },
        description: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        farmer: {
            type: moongose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        image: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);
const Product = moongose.model("Product", productSchema);

module.exports = Product;
