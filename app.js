import  http from 'http';
import { ConfigurationHelper } from "./modules/configuration/configHelper.js";
import { isMainThread } from "worker_threads";
import { WorkerFactory } from './modules/orchestration/workerFactory.js';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { ApiHelper } from './modules/api/apiHelper.js';

const applicationConfiguration = ConfigurationHelper.getConfig('./config/applicationConfig.json');

if (isMainThread) {
  // const siteCollector = WorkerFactory.createWorker('./modules/orchestration/popularSiteRetriever.js', applicationConfiguration );
  
  // siteCollector.on('message', msg => {
  //   console.log(msg);
  // });
  // siteCollector.on('error', err => {
  //   console.error(err);
  // });
  // siteCollector.on('exit', code  => {
  //   console.log(`Popular site colelctor stopped with exit code ${code}`);
  // });

  // const siteVisitor = WorkerFactory.createWorker('./modules/orchestration/popularSiteVisitor.js', applicationConfiguration );
  
  // siteVisitor.on('message', msg => {
  //   console.log(msg);
  // });
  // siteVisitor.on('error', err => {
  //   console.error(err);
  // });
  // siteVisitor.on('exit', code  => {
  //   console.log(`Popular site visitor stopped with exit code ${code}`);
  // });

}

const app = express();

const server = http.createServer(app);

const apiHelper = new ApiHelper(applicationConfiguration);

app.use(cors({origin: 'http://localhost:5173'}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/api/sites', (req, res) => {
  const currentDate = new Date();
  console.log(`[${currentDate.getHours()}:${currentDate.getMinutes()}] Sites API Called.`);
  apiHelper.getAllSites().then((data, err) => {
    if (err) {
      console.error(err);
    }
    res.json(data);
  });
});

app.get('/api/owners', (req, res) => {
  console.log('api/owners called!');
  apiHelper.getAllOwners().then((data, err) => {
    if (err) {
      console.error(err);
    }
    res.json(data);
  });
});

app.get('/api/trackers', (req, res) => {
  console.log('api/trackers called!');
  apiHelper.getAllTrackers().then((data, err) => {
    if (err) {
      console.error(err);
    }
    res.json(data);
  });
});

// Start the server
server.listen(applicationConfiguration.httpServerPort, () => {
  console.log(`Server listening on http://localhost:${applicationConfiguration.httpServerPort}`);
});