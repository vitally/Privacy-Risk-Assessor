import  http from 'http';
import { ConfigurationHelper } from "./modules/configuration/configHelper.js";
import { isMainThread } from "worker_threads";
import { WorkerFactory } from './modules/orchestration/workerFactory.js';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { ApiHelper } from './modules/api/apiHelper.js';
import { logInfo, logError } from './modules/utils/logger.js'; // Import the logger

const applicationConfiguration = ConfigurationHelper.getConfig('./config/applicationConfig.json');

if (isMainThread) {
  const siteCollector = WorkerFactory.createWorker('./modules/orchestration/popularSiteRetriever.js', applicationConfiguration );
  const siteVisitor = WorkerFactory.createWorker('./modules/orchestration/popularSiteVisitor.js', applicationConfiguration );
  
  siteCollector.on('message', msg => {
    // Assuming msg contains domainAddress for logging.
    // Consider adding a check if msg or msg.domainAddress is undefined.
    logInfo(`Site Collector dispatched task for domain: '${msg?.domainAddress || 'Unknown Domain'}'`);
    if (siteVisitor && typeof siteVisitor.postMessage === 'function') {
      siteVisitor.postMessage(msg);
    } else {
      logError('Site Visitor worker is not available or not responding to postMessage.');
      // Potentially handle the failure to send the message, e.g., by requeuing or notifying.
    }
  });
  siteCollector.on('error', err => {
    logError('Site Collector worker encountered an error:', err);
  });
  siteCollector.on('exit', code => {
    const exitMessage = `Popular Site Collector worker stopped with exit code ${code}.`;
    if (code === 0) {
      logInfo(exitMessage + ' (Graceful exit)');
    } else {
      logError(exitMessage + ' (Unexpected exit)');
    }
  });

  
  // General error handler for unhandled errors in the siteVisitor worker
  siteVisitor.on('error', err => {
    logError('Site Visitor worker encountered an unhandled error:', err);
    // Note: Automatic restart is complex and can lead to loops if the error is persistent.
    // A robust system might implement a backoff strategy or limit restart attempts.
    // For now, we focus on logging. The commented-out lines are removed.
  });

  // Handler for when the siteVisitor worker exits
  siteVisitor.on('exit', code => {
    const exitMessage = `Popular Site Visitor worker stopped with exit code ${code}.`;
    if (code === 0) {
      logInfo(exitMessage + ' (Graceful exit)');
    } else {
      logError(exitMessage + ' (Unexpected exit)');
      // If the worker exits unexpectedly, outstanding tasks in its queue might be lost
      // or API calls waiting for its response might hang or timeout.
    }
    // The commented-out lines for recreating the worker are removed.
  });

  // General message handler for siteVisitor to catch any messages not handled by specific .once() listeners,
  // including structured error reports from the worker's queue processing.
  siteVisitor.on('message', msg => {
    if (msg && msg.error === true) {
      // This handles errors reported by the worker's internal queue processing,
      // typically for tasks initiated by siteCollector.
      logError(`SiteVisitor worker reported a processing error for domain '${msg.domainAddress || 'Unknown Domain'}': ${msg.message}`, msg.stack);
    } else {
      // This would log any other general messages from siteVisitor not caught by a .once() listener.
      // Depending on application design, such messages might be unexpected or indicate a logic flaw.
      logInfo(`Received general message from SiteVisitor: ${JSON.stringify(msg)}`);
    }
  });

  // This 'process.on('message', ...)' seems to be for inter-process communication if app.js itself is a child process.
  // It's not directly related to the siteCollector/siteVisitor workers spawned by this process.
  // Ensuring it uses `this.siteCollector` implies `this` should be bound correctly or `siteCollector` should be accessible.
  // If this app.js is not meant to be a child process receiving messages, this might be dead or legacy code.
  // For now, assuming it's intended and `this` is contextually correct or siteCollector is in scope.
  process.on('message', message => {
    this.siteCollector.postMessage(message);
  });

  const app = express();

  const server = http.createServer(app);

  const apiHelper = new ApiHelper(applicationConfiguration);

  app.use(cors({origin: ['http://localhost:8080','http://localhost:3333']}));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  app.get('/api/sites', async (req, res) => {
    logInfo('Sites API Called.');
    try {
      const data = await apiHelper.getAllSites();
      res.json(data);
    } catch (err) {
      logError('Error in /api/sites:', err);
      res.status(500).json({ error: 'Failed to retrieve sites.' });
    }
  });

  app.get('/api/sites/stats', async (req, res) => {
    logInfo('Sites Statistics API Called.');
    try {
      const data = await apiHelper.getAllSiteStats();
      res.json(data);
    } catch (err) {
      logError('Error in /api/sites/stats:', err);
      res.status(500).json({ error: 'Failed to retrieve site statistics.' });
    }
  });

  app.get('/api/sites/totals', async (req, res) => {
    logInfo('Sites Statistics API Called.'); // Corrected from "Sites Statistics API Called."
    try {
      const data = await apiHelper.getSiteTotals();
      res.json(data);
    } catch (err) {
      logError('Error in /api/sites/totals:', err);
      res.status(500).json({ error: 'Failed to retrieve site totals.' });
    }
  });

  // app.get('/api/sites/completeInfo', (req, res) => {
  //   logInfo('Sites with Requests and Owners API Called.');
  //   apiHelper.getAllTheSitesWithRequestsAndOwners().then((data, err) => {
  //     if (err) {
  //       logError(err);
  //     }
  //     res.json(data);
  //   });
  // });

  app.get('/api/sites/cookiesByDomain', async (req, res) => {
    logInfo('Cookies by Domain API Called.');
    try {
      const data = await apiHelper.getAllCookiesByDomain();
      res.json(data);
    } catch (err) {
      logError('Error in /api/sites/cookiesByDomain:', err);
      res.status(500).json({ error: 'Failed to retrieve cookies by domain.' });
    }
  });

  app.get('/api/sites/:siteName', async (req, res) => {
    const siteToVisit = Buffer.from(req.params.siteName, 'base64').toString('utf8');
    logInfo(`Sites API Called. Need to visit '${siteToVisit}'`);
    try {
      // This endpoint interacts with workers, which is a bit different.
      // We'll need to wrap the worker interaction in a Promise to use await.
      const message = await new Promise((resolve, reject) => {
        siteCollector.postMessage(siteToVisit);
        
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for site visitor response'));
        }, applicationConfiguration.workerResponseTimeout || 10000); // Use a configurable timeout

        siteVisitor.once('message', msg => {
          clearTimeout(timeout);
          // Handle structured error messages from the worker if this message is an error report
          if (msg && msg.error === true) {
            logError(`SiteVisitor worker reported an error processing '${msg.domainAddress}': ${msg.message}`, msg.stack);
            // Reject the promise with an error that can be caught by the calling API endpoint
            reject(new Error(`Failed to process site: ${msg.domainAddress}. Worker error: ${msg.message}`));
          } else {
            resolve(msg);
          }
        });
        // This handles errors like the worker crashing or an explicit error event being emitted by the worker.
        siteVisitor.once('error', err => { 
          clearTimeout(timeout);
          logError(`SiteVisitor worker error during processing for '${siteToVisit}':`, err);
          reject(err);
        });
      });
      res.json(message);
    } catch (err) {
      // This catch block handles errors from the Promise (e.g., timeout, worker error, or explicit rejection)
      logError(`Error processing /api/sites/:siteName for '${siteToVisit}':`, err.message, err.stack);
      res.status(500).json({ error: `Failed to process site: ${siteToVisit}. ${err.message}` });
    }
  });

  app.post('/api/sites/fingerprint', async (req, res) => {
    try {
      logInfo(`Fingerprint attempt reported: ${JSON.stringify(req.body)}`);
      
      // Use the new method in ApiHelper to save fingerprint data
      await apiHelper.saveFingerprintData(req.body);
      res.status(200).send({ message: 'Fingerprint data received and saved.' });
    } catch (error) {
      // Log the error appropriately
      // The error might come from ApiHelper (e.g., database not available) or from the database operation itself
      logError('Error saving fingerprint data via ApiHelper:', error);
      res.status(500).send({ error: 'Error saving fingerprint data.' });
    }
  });

  app.get('/api/owners', async (req, res) => {
    logInfo('Owners API Called.');
    try {
      const data = await apiHelper.getAllOwners();
      res.json(data);
    } catch (err) {
      logError('Error in /api/owners:', err);
      res.status(500).json({ error: 'Failed to retrieve owners.' });
    }
  });

  app.get('/api/trackers', async (req, res) => {
    logInfo('Trackers API Called.');
    try {
      const data = await apiHelper.getAllTrackers();
      res.json(data);
    } catch (err) {
      logError('Error in /api/trackers:', err);
      res.status(500).json({ error: 'Failed to retrieve trackers.' });
    }
  });

  app.get('/api/trackers/groupByDomain', async (req, res) => {
    logInfo('Trackers Group By Domain API Called.');
    try {
      const data = await apiHelper.getAllRequestCountByDomainAddress();
      res.json(data);
    } catch (err) {
      logError('Error in /api/trackers/groupByDomain:', err);
      res.status(500).json({ error: 'Failed to retrieve trackers grouped by domain.' });
    }
  });

  app.post('/api/docs/generate', async (req, res) => {
    logInfo('Document Generation API Called.');
    const requestData = req.body;
    try {
      const data = await apiHelper.createComplaintDocument(requestData);
      res.set('Content-Type', 'application/octet-stream');
      res.set('Content-Disposition', `attachment; filename=${requestData.firstName}${requestData.lastName}-DVI-Complaint.docx`);
      res.send(data);
    } catch (err) {
      logError('Error in /api/docs/generate:', err);
      // Ensure headers are not set if an error occurs before sending data
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to generate document.' });
      }
    }
  });

  app.use((req, res, next) => {
    res.status(404).send('Not Found');
  });

  // Start the server
  server.listen(applicationConfiguration.httpServerPort, () => {
    logInfo(`Server listening on http://localhost:${applicationConfiguration.httpServerPort}`);
  });
}