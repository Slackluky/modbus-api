require('dotenv').config();
const express = require('express');
const { DEFAULT_TIMEZONE } = require('./src/config/timezone');

// Set default timezone for the application
process.env.TZ = DEFAULT_TIMEZONE;
const cors = require('cors');
const modbusClient = require('./src/config/modbus');
const relayRoutes = require('./src/routes/relayRoutes');
const logger = require('./src/config/logger');
const timerManager = require('./src/services/timerManager');

const app = express();
const port = process.env.PORT || 4000;
const host = process.env.HOST || 'localhost';

// Configure middleware
app.use(cors());
app.use(express.json());

// Initialize services
Promise.all([
    modbusClient.connect(),
    timerManager.init()
]).catch(err => {
    logger.error('Failed to initialize services', { error: err.message });
    process.exit(1);
});

// Mount routes at root path
app.use('/', relayRoutes);

const server = app.listen(port, host, () => {
    logger.info(`Modbus control server running at http://${host}:${port}`);
});

// Graceful shutdown
let isShuttingDown = false;

const gracefulShutdown = async () => {
    if (isShuttingDown) {
        logger.info('Shutdown already in progress...');
        return;
    }
    
    isShuttingDown = true;
    logger.info('Initiating graceful shutdown...');
    
    // Close the HTTP server
    await new Promise((resolve) => {
        server.close(() => {
            logger.info('HTTP server closed');
            resolve();
        });
    });

    try {
        // Close Modbus connection
        await modbusClient.close();
        logger.info('Modbus connection closed');
    } catch (err) {
        logger.error('Error closing Modbus connection:', err);
    }

    logger.info('Graceful shutdown complete');
    process.exit(0);
};

// Handle various shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', async (err) => {
    logger.error('Uncaught Exception:', { error: err.message, stack: err.stack });
    await gracefulShutdown();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
    logger.error('Unhandled Rejection', { error: reason?.message || reason, stack: reason?.stack });
    await gracefulShutdown();
});
