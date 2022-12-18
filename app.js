import  http from 'http';
import { ConfigurationHelper } from "./modules/configuration/configHelper.js";
import { isMainThread } from "worker_threads";
import { WorkerFactory } from './modules/orchestration/workerFactory.js';
import { createApp, createRenderer } from 'vue';
import express from 'express';
import path from 'path';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { DatabaseHelper } from './modules/database/databaseHelper.js';

const applicationConfiguration = ConfigurationHelper.getConfig('./config/applicationConfig.json');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log('directory-name 👉️', __dirname);

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
const vueApp = createApp();

const server = http.createServer(app);

app.use(cors({origin: 'http://localhost:8081'}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, './public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, './public/index.html'));
});

app.get('/api/sites', (req, res) => {
  const db = new DatabaseHelper(applicationConfiguration.mongoURI);
  const sites = db.getAllCollectionValues('popularSites').toArray();
  console.log('api/sites called!');
  res.json(sites);
});

app.get('/api/owners', (req, res) => {
  console.log('api/owners called!');
  res.json(users);
});

app.get('/api/trackers', (req, res) => {
  console.log('api/trackers called!');
  res.json(users);
});

// Start the server
server.listen(applicationConfiguration.httpServerPort, () => {
  console.log(`Server listening on http://localhost:${applicationConfiguration.httpServerPort}`);
});