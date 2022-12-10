import { readFileSync } from "node:fs";

export { ConfigurationHelper };

class ConfigurationHelper{
    static getParsedJson(path){
        const jsonFiletext = readFileSync(path);
        return  JSON.parse(jsonFiletext);
    }

    static getConfig(path){
        return this.getParsedJson(path);
    }

    static getWhoisServers(path){
        return this.getParsedJson(path);
    }

}