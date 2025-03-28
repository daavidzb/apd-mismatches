const connection = require("../../db/connection");

const get_categorias = async (req, res) => {
  try {
    const query = `
            SELECT 
                id_categoria,
                nombre
            FROM categorias_descuadre 
            ORDER BY nombre`;

    connection.query(query, (error, results) => {
      if (error) {
        console.error("Database error:", error);
        return res.status(500).json({ error: error.message });
      }
      res.json({ categorias: results || [] });
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
    get_categorias,
}