import puppeteer from "puppeteer";
import { URLHelper } from "./urlHelper.js";

export { NavigationHelper };

class NavigationHelper {
    async vistPage(url){
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(url);
        await page.screenshot({path: 'example.png'});
        await browser.close();
    }

    async visitPageAndInterceptURLs(url){
        const requestArray = [];
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        const urlSecondLevelDomain = URLHelper.trimUrlToSecondLevelDomain(url);
        await page.setRequestInterception(true);
        page.on('request', interceptedRequest => {
            const requestURL = interceptedRequest.url();
            if ((URLHelper.trimUrlToSecondLevelDomain( requestURL ) !== urlSecondLevelDomain) 
                    && !(requestURL.endsWith('.jpg') || requestURL.endsWith('.png') || 
                        requestURL.endsWith('.css') || requestURL.endsWith('.ttf') || 
                        requestURL.endsWith('.svg')) ){
                requestArray.push( requestURL );
                console.log(interceptedRequest.headers());
                console.log(interceptedRequest.method());
                console.log(interceptedRequest.postData());
                //https://filipvitas.medium.com/how-to-set-user-agent-header-with-puppeteer-js-and-not-fail-28c7a02165da
            }
            interceptedRequest.continue();
        });
        try {
            await page.goto(url, {waitUntil: 'networkidle0'});
            // const client = await page.target().createCDPSession();
            // const cookies = (await client.send('Network.getAllCookies')).cookies;
            // console.log(cookies);
        } catch (error) {
            console.error(error);
        }
        await browser.close();
        return requestArray;
    }
}