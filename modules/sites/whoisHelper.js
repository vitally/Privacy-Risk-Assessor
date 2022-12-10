import { ConfigurationHelper } from '../configuration/configHelper.js';
import net, { Socket } from 'net';
import { resolve } from 'path';
import { type } from 'os';
import { rejects } from 'assert';

export { WhoisHelper };

class WhoisHelper{ 

    whoisServerList = {};
    registrar = '';
    secondLevelDomain = '';
    
    constructor(){
        this.whoisServerList = ConfigurationHelper.getWhoisServers('./config/whoisServers.json');
    }

    getRegistrar(domain){
        const domainLevelsArray = domain.split('.');
        this.secondLevelDomain = `${domainLevelsArray[domainLevelsArray.length-2]}.${domainLevelsArray[domainLevelsArray.length-1]}`.replace('https://','').replace('http://','');
        let registrar = this.whoisServerList[this.secondLevelDomain];
        if (!registrar) {
            registrar = this.whoisServerList[domainLevelsArray[domainLevelsArray.length-1]];
        }
        this.registrar = typeof registrar === 'object' ? registrar.host : registrar;
        return this.registrar;
    }

    parseWhoisResponse(response) {
        const result = {};
        let responseWithEmptyValues = response.replace(/:[ ]*\n/g,':N/A\n');
        const regex = /^([^:]+):\s*(.+)$/gm;
        let match;
        while ((match = regex.exec(responseWithEmptyValues)) !== null) {
          const key = match[1].replace('>>>','').replace('<<<','').trim();
          const value = match[2].replace('>>>','').replace('<<<','').trim();
          result[key] = value;
        }
        return result;
    }

    getPropertyNamesContainingString(json, stringToFind){
        const keys = Object.keys(json);
        return keys.filter((key) => key.includes(stringToFind));
    }

    async makeWhoisRequest(domain, whoisServer){
        return new Promise((resolve, reject) => {
            const socket = net.createConnection({
                host: whoisServer,
                port: 43
            });
    
            const timeoutId = setTimeout(() => {
                // Handle the timeout event by rejecting the promise with an error
                reject(new Error(`Timeout reached connecting trying to resolve '${domain}' via ${whoisServer}`));
              }, 15000);

            socket.write(`${this.secondLevelDomain}\r\n`);
            
            let data = '';
    
            socket.on('error', err => {
                clearTimeout(timeoutId);s
                reject(err);
            });
            
            socket.on('end', () => {
                clearTimeout(timeoutId);
                const response = this.parseWhoisResponse(data);
                resolve(response);
            });
    
            // Handle the WHOIS response
            socket.on('data', chunkOfData => {
                data += chunkOfData;
            });

        });
    }

    async getWhoisInfo(domain){
        const nameVariantsToCheck = new Set(['Name', 'Registrant Name']);
        let whoisServer = this.getRegistrar(domain);
        let result = {};
        while (whoisServer) {
            result = await this.makeWhoisRequest(domain, whoisServer);
            const namesFound = this.getPropertyNamesContainingString(result,'Name');
            const matchingNamesPresent = [...nameVariantsToCheck].some((value) => namesFound.includes(value));
            whoisServer = matchingNamesPresent ? '' :result['Registrar WHOIS Server'];
        }
        return result;
    }
}