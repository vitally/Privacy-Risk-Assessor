import puppeteer from "puppeteer";
export { NavigationHelper };

class NavigationHelper {
    async vistPage(url){
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(url);
        await page.screenshot({path: 'example.png'});
        await browser.close();
    }

    async visitPageAndInterceptURLs(url){
        const requestArray = [];
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on('request', interceptedRequest => {
            // if (interceptedRequest.url().match) {
                
            // }
            requestArray.push(interceptedRequest.url());
            interceptedRequest.continue();
        });
        await page.goto(url);
        await browser.close();
        return requestArray;
    }
}