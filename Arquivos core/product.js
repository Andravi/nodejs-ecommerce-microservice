const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "O nome do produto é obrigatório"],
    trim: true,
  },
  description: {
    type: String,
    required: false,
  },
  price: {
    type: Number,
    required: [true, "O preço do produto é obrigatório"],
    min: [0, "O preço não pode ser negativo"],
  },
});

const Product = mongoose.model("Product", ProductSchema);

module.exports = Product;
