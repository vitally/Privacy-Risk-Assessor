export { URLHelper };

class URLHelper {
    static domainNameRegEx = /([a-z0-9A-Z]\.)*[a-z0-9-]+\.([a-z0-9-]{2,24})+(\.co\.([a-z0-9]{2,24})|\.([a-z0-9]{2,24}))*/g;
    static urlWithourParamsRegEx = /(http(s)?):\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]+\.[a-z]{2,6}([-a-zA-Z0-9_\+.~/]*)/g;

    static trimUrlToSecondLevelDomain(url){
        const urlMatchArray = url.match(this.domainNameRegEx);
        if (!urlMatchArray) {
            return url;
        }
        const urlFullDomain = urlMatchArray[0];
        const domainLevelsArray = urlFullDomain.split('.');
        return domainLevelsArray[domainLevelsArray.length - 2] + '.' + domainLevelsArray[domainLevelsArray.length - 1] 
    }

    static trimUrlToRemoveParameters(url){
        const urlMatchArray = url.match(this.urlWithourParamsRegEx);
        return urlMatchArray ? (urlMatchArray.length > 0 ? urlMatchArray[0] : '') : url;
    }

}