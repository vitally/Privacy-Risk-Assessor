export { URLHelper };

class URLHelper {
    static trimUrlToSecondLevelDomain(url){
        const domainNameRegEx = /([a-z0-9A-Z]\.)*[a-z0-9-]+\.([a-z0-9]{2,24})+(\.co\.([a-z0-9]{2,24})|\.([a-z0-9]{2,24}))*/g;
        const urlFullDomain = url.match(domainNameRegEx)[0];
        const domainLevelsArray = urlFullDomain.split('.');
        return domainLevelsArray[domainLevelsArray.length - 2] + '.' + domainLevelsArray[domainLevelsArray.length - 1] 
    }
}