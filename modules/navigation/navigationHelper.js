import puppeteer from 'puppeteer-extra';
import { executablePath } from 'puppeteer';
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { URLHelper } from './urlHelper.js';
import moment from 'moment';

export { NavigationHelper };

class NavigationHelper {

    async configureBrowser(userAgent){
        return await puppeteer.launch({ 
            headless: true,
            executablePath: executablePath(),
            args: [
                `--user-agent=${userAgent}`
            ] 
        });
    }

    replaceNavigatorProperties(targetObject, userAgent){
        Object.defineProperty(targetObject.navigator, 'userAgent', { get: () => userAgent });
        Object.defineProperty(targetObject.navigator, 'platform', { get: () => 'Win32' });
        Object.defineProperty(targetObject.navigator, 'productSub', { get: () => '20100101' });
        Object.defineProperty(targetObject.navigator, 'vendor', { get: () => '' });
        Object.defineProperty(targetObject.navigator, 'oscpu', { get: () => 'Windows NT 10.0; Win64; x64' });
    }

    async visitPageAndInterceptURLs(url){
        //Fake user agent is built using:
        //https://filipvitas.medium.com/how-to-set-user-agent-header-with-puppeteer-js-and-not-fail-28c7a02165da
        //https://scrapingant.com/blog/puppeteer-tricks-to-avoid-detection-and-make-web-scraping-easier
        const fakeUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:73.0) Gecko/20100101 Firefox/73.0';
        puppeteer.use(StealthPlugin());
        const browser = await this.configureBrowser(fakeUserAgent);

        const page = (await browser.pages())[0];
        page.canvasFingerprintingDetected = false;
        // const page = (await browser.pages())[0];
        const urlSecondLevelDomain = URLHelper.trimUrlToSecondLevelDomain(url);
        // //Faking User Agent
        await page.evaluateOnNewDocument(fakeUserAgent => {
            //faking window.open
            let open = window.open;
            //faking navigator in a new page
            window.open = (...args) => {
                let newPage = open(...args);
                replaceNavigatorProperties(newPage,fakeUserAgent);
            };
            //faking navigator in an original page
            replaceNavigatorProperties(this,fakeUserAgent);

            //overriding canvas finegrprint attempt
            const originalCanvasToDataURL = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = (type) => {
                console.log(`[${moment().format('DD.MM.YYYY HH:MM:ss')}] Canvas '${url}'`);
                if (type.indexOf('image') > -1) {
                    // this is likely a fingerprint attempt, return fake fingerprint
                    return `data:${type};base64,iVBORw0KGgoAAAANSUhEUgAAANwAAAAeCAAAAABiES/iAAACeElEQVRYw+2YzUtUURjGf47OmDPh5AyFomUiEeEmyghXtWsh4dcswlYV2KYWfZh/QRBUVLhTCCJXEgmKUCIkFhJREARBkbkyKBlTRmUC82lxZ7z3TjM4whwXwz2ry3vO87znx33Pey4XFfHAg/PgPDgPzoPz4Dy4rFIKscSkAfmnsUY+iTfXFhxue4Zm4QpfaKbg8k+EsZNsGG6iNVzRMrkZeRPmjp6eCgcae5f+3wJIgtWLldG+DUnfzoail1etaVsEa1f2lUqw2hPd3T7nCrkMtlkQ24YDwP8+FZkI+gY3uq2cTcu54GIA/dJCDUAnSE4RdAESdALUxZ0hl4E5OMs49iE528E5a+cj5YFhDVI3vLA2c4K+zLXpvR37tNRDs3STg1OJqXqQSwS14wlJUD+VeHWAW86Qy8BwQ5Ek/WK/JBgqC72UTvJakmY5lAvurTRPSDrMmKRRcIvgeUo2KmmEI86Qy8DwmVu/ezQIBCSBLzwjKZhujv5cZZmUNkAq57ekRXCLYDG12pre5Qy5DAzDXbPfIOB/JqmCzNafCZd+dMA5RfZxdsBlNTAMF+FJfD2eSvSI0iGpmXe5GnbG3qyyHAO3yCZxlGV2uBLWDcJVMZKc7UrnfIBvQI+pHpxbS34ZaNkK7gYN0yvTDSCXyCZxNJTscFFe/DUH1w3QvpnzPiUPdTXfsvxZDdBGmeQU2SQd9lWQHS5m9J6Ln4/suZCwc96D25qM1formq5/3ApOX1uDkZ7P7JXkENkkK5eqQm3flRtuvitSYgCucKOf0zv01bazcG3Tyz8GKukvSjjrlB3/U5Rw42dqAo29yypKOO8figeX1/gH+zX9JqfOeUwAAAAASUVORK5CYII=`;
                }
                // otherwise, just use the original function
                return originalCanvasToDataURL.apply(this, arguments);
            };

        }, fakeUserAgent);

        browser.on('targetcreated', async (target) => {
            const createdPage = await target.page();
            await createdPage?.setUserAgent(fakeUserAgent);
        });

        // await page.setUserAgent(fakeUserAgent);
        //EOF Fakeing User Agent
        const siteVisit = new Object();
        siteVisit.requests = [];
        
        await page.setRequestInterception(true);
        page.on('request', interceptedRequest => {
            const requestURL = interceptedRequest.url(); 
            const requestDetails = {
                fullUrl : requestURL,
                urlWithoutParams : URLHelper.trimUrlToRemoveParameters(requestURL),
                headers : interceptedRequest.headers(),
                method : interceptedRequest.method(),
                postData : interceptedRequest.postData()
            };
            if ((URLHelper.trimUrlToSecondLevelDomain( requestDetails.urlWithoutParams ) !== urlSecondLevelDomain) 
                    && !(requestDetails.urlWithoutParams.endsWith('.jpg') || requestDetails.urlWithoutParams.endsWith('.png') || 
                    requestDetails.urlWithoutParams.endsWith('.css') || requestDetails.urlWithoutParams.endsWith('.ttf') || 
                    requestDetails.urlWithoutParams.endsWith('.svg') || requestDetails.urlWithoutParams.endsWith('.jpeg') ||
                    requestDetails.urlWithoutParams.endsWith('.gif') || requestDetails.urlWithoutParams.endsWith('.woff2') ||
                    requestDetails.urlWithoutParams.endsWith('.woff') || requestDetails.urlWithoutParams.indexOf('data:') === 0 )){
                siteVisit.requests.push( requestDetails );
            }
            if(requestDetails.fullUrl.includes('iVBORw0KGgoAAAANSUhEUg')){
                siteVisit.canvasFingerprintingDetected = true;
            }
            interceptedRequest.continue();
        });
        try {
            const pageVisitResponse =  await page.goto(url);
            console.log(`[${moment().format('DD.MM.YYYY HH:MM:ss')}] Visiting '${url}'`);
            const client = await page.target().createCDPSession();
            const pageCookies = (await client.send('Network.getAllCookies')).cookies;
            const pageLocalStorage = await page.evaluate(() => JSON.stringify(window.localStorage));
            // const pageCanvas = await page.$eval('canvas', el => el?.toDataURL());
            // console.log(`[${moment().format('DD.MM.YYYY HH:MM:ss')}] Canvas on the page: '${pageCanvas}'`);
            // if (pageCanvas?.includes('iVBORw0KGgoAAAANSUhEUg')) {
            //     console.log('CANVAS!!!');
            // }
            siteVisit.pageSourceCode = await pageVisitResponse.text();
            siteVisit.cookies = pageCookies;
            siteVisit.localStorage = JSON.parse(pageLocalStorage); 
        } catch (error) {
            console.error(error);
        } finally {
            await browser.close();
        }

        return siteVisit;
    }
}