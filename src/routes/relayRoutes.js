const express = require('express');
const router = express.Router();
const relayController = require('../controllers/relayController');

// Get list of all slaves
router.get('/slaves', relayController.getSlaves);

// Get state of a single relay for a specific slave
router.get('/slave/:slaveId/relay/:number', relayController.getRelayState);

// Set state of a single relay for a specific slave
router.post('/slave/:slaveId/relay/:number', relayController.setRelayState);

// Set multiple relay states for a specific slave
router.post('/slave/:slaveId/relays', relayController.setMultipleRelayStates);

// Schedule routes
// Get all schedules
router.get('/schedules', relayController.getAllTimers);

// Get schedules for specific relay
router.get('/slave/:slaveId/relay/:number/schedules', relayController.getRelayTimer);

// Set schedule for specific relay
// Body params:
// - startTime: string (ISO date for 'once', 'HH:mm' for 'daily' and 'weekly')
// - endTime: string (ISO date for 'once', 'HH:mm' for 'daily' and 'weekly')
// - recurrence: string ('once', 'daily', 'weekly')
// - daysOfWeek: number[] (required for weekly, 0-6 where 0 is Sunday)
router.post('/slave/:slaveId/relay/:number/schedule', relayController.setRelayTimer);

// Clear specific schedule
router.delete('/schedule/:scheduleId', relayController.clearRelayTimer);

module.exports = router;
