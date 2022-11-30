import puppeteer from 'puppeteer-extra';
import { executablePath } from 'puppeteer';
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { URLHelper } from './urlHelper.js';
// import { fs } from 'fs';

export { NavigationHelper };

class NavigationHelper {
    async vistPage(url){
        puppeteer.use(StealthPlugin());
        const browser = await puppeteer.launch({ headless: true });
        const page = (await browser.pages())[0];
        await page.goto(url);
        await page.screenshot({path: 'example.png'});
        await browser.close();
    }

    async visitPageAndInterceptURLs(url){
        const requestArray = [];
        //Fake user agent is built using:
        //https://filipvitas.medium.com/how-to-set-user-agent-header-with-puppeteer-js-and-not-fail-28c7a02165da
        //https://scrapingant.com/blog/puppeteer-tricks-to-avoid-detection-and-make-web-scraping-easier
        const fakeUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:73.0) Gecko/20100101 Firefox/73.0';
        puppeteer.use(StealthPlugin());
        const browser = await puppeteer.launch({ 
            headless: true,
            executablePath: executablePath(),
            args: [
                `--user-agent=${fakeUserAgent}`
            ] 
        });
        const page = (await browser.pages())[0];
        // const page = (await browser.pages())[0];
        const urlSecondLevelDomain = URLHelper.trimUrlToSecondLevelDomain(url);
        // //Faking User Agent
        await page.evaluateOnNewDocument(fakeUserAgent => {
            //faking window.open
            let open = window.open;
            //faking navigator in a new page
            window.open = (...args) => {
                let newPage = open(...args);
                Object.defineProperty(newPage.navigator, 'userAgent', { get: () => fakeUserAgent });
                Object.defineProperty(newPage.navigator, 'platform', { get: () => 'Win32' });
                Object.defineProperty(newPage.navigator, 'productSub', { get: () => '20100101' });
                Object.defineProperty(newPage.navigator, 'vendor', { get: () => '' });
                Object.defineProperty(newPage.navigator, 'oscpu', { get: () => 'Windows NT 10.0; Win64; x64' });
            };
            //faking navigator in an original page
            Object.defineProperty(navigator, 'userAgent', { get: () => fakeUserAgent });
            Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
            Object.defineProperty(navigator, 'productSub', { get: () => '20100101' });
            Object.defineProperty(navigator, 'vendor', { get: () => '' });
            Object.defineProperty(navigator, 'oscpu', { get: () => 'Windows NT 10.0; Win64; x64' });

            //overriding canvas finegrprint attempt
            const originalCanvasToDataURL = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = (type) => {
                if (type.indexOf('image') > -1) {
                    // this is likely a fingerprint attempt, return fake fingerprint
                    //"data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAEALAAAAAABAAEAAAIBTAA7"
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
        await page.setRequestInterception(true);
        page.on('request', interceptedRequest => {
            const requestURL = interceptedRequest.url();
            if ((URLHelper.trimUrlToSecondLevelDomain( requestURL ) !== urlSecondLevelDomain) 
                    && !(requestURL.endsWith('.jpg') || requestURL.endsWith('.png') || 
                        requestURL.endsWith('.css') || requestURL.endsWith('.ttf') || 
                        requestURL.endsWith('.svg') || requestURL.endsWith('.jpeg')) ){
                requestArray.push( requestURL );
                // console.log(interceptedRequest.headers());
                // console.log(interceptedRequest.method());
                // console.log(interceptedRequest.postData());
            }
            interceptedRequest.continue();
        });
        try {
            await page.goto(url);
            const pageCookies = await page.cookies();
            const pageCookiesJSON = JSON.stringify(pageCookies);
            console.log(pageCookiesJSON);
            const pageLocalStorage = await page.evaluate(() => JSON.stringify(window.localStorage));
            console.log(pageLocalStorage);
            // const client = await page.target().createCDPSession();
            // const cookies = (await client.send('Network.getAllCookies')).cookies;
            // console.log(cookies);
        } catch (error) {
            console.error(error);
        }
        await browser.close();

        // fs.writeFileSync('requests.txt', requestArray, err => {
        //     if (err) {
        //       console.error(err);
        //     }
        //     // file written successfully
        //   });

        return requestArray;
    }
}