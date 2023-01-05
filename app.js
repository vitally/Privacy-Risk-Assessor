import  http from 'http';
import { ConfigurationHelper } from "./modules/configuration/configHelper.js";
import { isMainThread } from "worker_threads";
import { WorkerFactory } from './modules/orchestration/workerFactory.js';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { ApiHelper } from './modules/api/apiHelper.js';
import moment from 'moment';

const applicationConfiguration = ConfigurationHelper.getConfig('./config/applicationConfig.json');

if (isMainThread) {
  const siteCollector = WorkerFactory.createWorker('./modules/orchestration/popularSiteRetriever.js', applicationConfiguration );
  const siteVisitor = WorkerFactory.createWorker('./modules/orchestration/popularSiteVisitor.js', applicationConfiguration );
  
  siteCollector.on('message', msg => {
    console.log(`[${moment().format('DD.MM.YYYY HH:MM:SS')}] Sites Colelctor: '${msg.domainAddress}'`);
    siteVisitor.postMessage(msg);
  });
  siteCollector.on('error', err => {
    console.error(err);
  });
  siteCollector.on('exit', code  => {
    console.log(`Popular site colelctor stopped with exit code ${code}`);
  });

  
  siteVisitor.on('error', err => {
    console.error(err);
    siteVisitor = WorkerFactory.createWorker('./modules/orchestration/popularSiteVisitor.js', applicationConfiguration );
  });
  siteVisitor.on('exit', code  => {
    console.log(`Popular site visitor stopped with exit code ${code}`);
    siteVisitor = WorkerFactory.createWorker('./modules/orchestration/popularSiteVisitor.js', applicationConfiguration );
  });

  process.on('message', message => {
    this.siteCollector.postMessage(message);
  });

  const app = express();

  const server = http.createServer(app);

  const apiHelper = new ApiHelper(applicationConfiguration);

  app.use(cors({origin: 'http://localhost:8080'}));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  app.get('/api/sites', (req, res) => {
    console.log(`[${moment().format('DD.MM.YYYY HH:MM:SS')}] Sites API Called.`);
    apiHelper.getAllSites().then((data, err) => {
      if (err) {
        console.error(err);
      }
      res.json(data);
    });
  });

  app.get('/api/sites/completeInfo', (req, res) => {
    console.log(`[${moment().format('DD.MM.YYYY HH:MM:SS')}] Sites with Requests and Owners API Called.`);
    apiHelper.getAllTheSitesWithRequestsAndOwners().then((data, err) => {
      if (err) {
        console.error(err);
      }
      res.json(data);
    });
  });

  app.get('/api/sites/:siteName', (req, res) => {
    const siteToVisit = Buffer.from(req.params.siteName, 'base64').toString('utf8');
    console.log(`[${moment().format('DD.MM.YYYY HH:MM:SS')}] Sites API Called. Need to visit '${siteToVisit}'`);
    siteCollector.postMessage(siteToVisit);
    siteVisitor.once('message', msg => {
      res.json(msg);
    });
  });

  app.get('/api/owners', (req, res) => {
    console.log(`[${moment().format('DD.MM.YYYY HH:MM:SS')}] Owners API Called.`);
    apiHelper.getAllOwners().then((data, err) => {
      if (err) {
        console.error(err);
      }
      res.json(data);
    });
  });

  app.get('/api/trackers', (req, res) => {
    console.log(`[${moment().format('DD.MM.YYYY HH:MM:SS')}] Trackers API Called.`);
    apiHelper.getAllTrackers().then((data, err) => {
      if (err) {
        console.error(err);
      }
      res.json(data);
    });
  });

  app.get('/api/trackers/groupByDomain', (req, res) => {
    console.log(`[${moment().format('DD.MM.YYYY HH:MM:SS')}] Trackers Group By Domain API Called.`);
    apiHelper.getAllRequestCountByDomainAddress().then((data, err) => {
      if (err) {
        console.error(err);
      }
      res.json(data);
    });
  });

  app.get('/api/docs/generate', (req, res) => {
    console.log(`[${moment().format('DD.MM.YYYY HH:MM:SS')}] Document Generation API Called.`);
    const requestData = JSON.parse(req.body);
    res.set('Content-Type', 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename=${requestData.firstName}${requestData.lastName}-DVI-Complaint.docx`);
    apiHelper.createComplaintDocument(requestData).then((data, err) => {
      if (err) {
        res.status(500).send(err);
      }
      res.send(data);
    });
  });

  app.use((req, res, next) => {
    res.status(404).send('Not Found');
  });

  // Start the server
  server.listen(applicationConfiguration.httpServerPort, () => {
    console.log(`Server listening on http://localhost:${applicationConfiguration.httpServerPort}`);
  });
}