const express = require('express');
const multer = require('multer');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Habilitar CORS y lectura de datos JSON
app.use(cors());
app.use(express.json());

// 1. CONEXIÓN A POSTGRESQL (¡Cambia estos datos por los tuyos!)
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'pmobimnec',
  port: 5432,
});

// 2. CONFIGURAR DÓNDE SE GUARDAN LOS ARCHIVOS FÍSICOS
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads/videos/'));
  },
  filename: function (req, file, cb) {
    const nombreUnico = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, nombreUnico + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// 3. RUTAS PARA MOSTRAR ARCHIVOS Y LA PÁGINA WEB
// Hacer pública la carpeta de videos
app.use('/archivos', express.static(path.join(__dirname, 'uploads/videos')));

// Mostrar la página index.html cuando entren a la IP principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 4. RUTA PARA SUBIR EL VIDEO (Guarda en VPS y en BD)
app.post('/subir', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se envió ningún video' });
    }

    const titulo = req.body.titulo || 'Video sin título';
    const rutaParaBD = `/archivos/${req.file.filename}`; 

    const query = 'INSERT INTO videos (titulo, ruta_video) VALUES ($1, $2) RETURNING *';
    const values = [titulo, rutaParaBD];
    const resultado = await pool.query(query, values);

    res.status(201).json({
      mensaje: 'Video subido y guardado con éxito',
      video: resultado.rows[0]
    });

  } catch (error) {
    console.error('Error al subir:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 5. RUTA PARA OBTENER LA LISTA DE VIDEOS DESDE LA BD
app.get('/videos', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM videos ORDER BY fecha_subida DESC');
    res.json(resultado.rows);
  } catch (error) {
    console.error('Error al obtener videos:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

// 6. INICIAR EL SERVIDOR (Escuchando en 0.0.0.0 para aceptar conexiones externas)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://0.0.0.0:${PORT}`);
});
