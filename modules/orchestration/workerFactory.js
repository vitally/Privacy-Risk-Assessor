import { Worker } from "worker_threads";
export { WorkerFactory }

class WorkerFactory{
    static createWorker(fileName, config){
        return new Worker(fileName, {
            workerData: config
          });
    }
}