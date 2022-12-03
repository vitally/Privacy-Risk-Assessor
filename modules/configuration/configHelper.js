import { readFileSync } from "node:fs";

export { ConfigurationHelper };

class ConfigurationHelper{
    static getConfig(path){
        const congigJSON = readFileSync(path);
        return  JSON.parse(congigJSON);
    }
}