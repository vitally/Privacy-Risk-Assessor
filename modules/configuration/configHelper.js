import { readFileSync } from "node:fs";

export { ConfigurationHelper };

class ConfigurationHelper{
    static getParsedJson(path){
        const jsonFileText = readFileSync(path);
        return  JSON.parse(jsonFileText);
    }

    static getConfig(path){
        return this.getParsedJson(path);
    }

    static getWhoisServers(path){
        return this.getParsedJson(path);
    }

}