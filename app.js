import  http from 'http';
import { ConfigurationHelper } from "./modules/configuration/configHelper.js";
import { isMainThread } from "worker_threads";
import { WorkerFactory } from './modules/orchestration/workerFactory.js';

const applicationConfiguration = ConfigurationHelper.getConfig('./config/applicationConfig.json');

if (isMainThread) {
  const siteCollector = WorkerFactory.createWorker('./modules/orchestration/popularSiteRetriever.js', applicationConfiguration );
  
  siteCollector.on('message', msg => {
    console.log(msg);
  });
  siteCollector.on('error', err => {
    console.error(err);
  });
  siteCollector.on('exit', code  => {
    console.log(`Popular site colelctor stopped with exit code ${code}`);
  });

  const siteVisitor = WorkerFactory.createWorker('./modules/orchestration/popularSiteVisitor.js', applicationConfiguration );
  
  siteVisitor.on('message', msg => {
    console.log(msg);
  });
  siteVisitor.on('error', err => {
    console.error(err);
  });
  siteVisitor.on('exit', code  => {
    console.log(`Popular site visitor stopped with exit code ${code}`);
  });

}


// const server = http.createServer((req, res) => {
//   res.statusCode = 200;
//   res.setHeader('Content-Type', 'text/plain');
//   res.write('element');
//   res.end();
// });

// server.listen(applicationConfiguration.httpServerPort, applicationConfiguration.httpServerHostname, () => {
//   console.log(`Server running at http://${applicationConfiguration.httpServerHostname}:${applicationConfiguration.httpServerPort}/`);
// });