const express = require('express');
const Rosemary = require('./Rosemary');
const bodyParser = require('body-parser');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

/**
 * Initialize Express application and Rosemary brain
 */
const app = express();
const brain = new Rosemary();

// Middleware
app.use(bodyParser.json());

/**
 * API Router Configuration
 */
const apiRouter = express.Router();
app.use('/api/v1', apiRouter);

/**
 * Leaf Management Routes
 */
apiRouter.post('/leaf', async (req, res) => {
  const { content, tags } = req.body;
  try {
    const id = await brain.addLeaf(content, tags);
    res.status(201).json({ id, message: 'Leaf added successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

apiRouter.get('/leaf/:id', async (req, res) => {
  try {
    const leaf = await brain.getLeafById(req.params.id);
    res.json(leaf);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

apiRouter.get('/leaves', async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const allLeaves = await brain.getAllLeaves();
  const leaves = allLeaves.slice(startIndex, endIndex);
  
  res.json({
    currentPage: page,
    totalPages: Math.ceil(allLeaves.length / limit),
    leaves
  });
});

/**
 * Search Routes
 */
apiRouter.get('/search', async (req, res) => {
  const { query } = req.query;
  const results = await brain.getLeavesByContent(query);
  res.json(results);
});

apiRouter.get('/fuzzy-search', async (req, res) => {
  const { query } = req.query;
  const results = await brain.fuzzySearch(query);
  res.json(results.map(({ item, score }) => ({ item, score })));
});

/**
 * Leaf Modification Routes
 */
apiRouter.post('/tag/:id', async (req, res) => {
  const { tags } = req.body;
  try {
    await brain.tagLeaf(req.params.id, ...tags);
    res.json({ message: 'Tags added successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

apiRouter.post('/connect', async (req, res) => {
  const { id1, id2, type } = req.body;
  try {
    await brain.connectLeaves(id1, id2, type);
    res.json({ message: 'Leaves connected successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Data Import/Export Routes
 */
apiRouter.get('/export', async (req, res) => {
  try {
    const data = await brain.createExportData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/import', async (req, res) => {
  const { data } = req.body;
  try {
    await brain.importData(JSON.stringify(data));
    res.json({ message: 'Data imported successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Error Handling Middleware
 */
function errorHandler(err, req, res, next) {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
}

app.use(errorHandler);

/**
 * Swagger API Documentation
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Rosemary API',
      version: '1.0.0',
    },
  },
  apis: ['./src/api.js'], // path to API docs
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * Start the server
 */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`🌿 Rosemary API server running on port ${PORT}`));