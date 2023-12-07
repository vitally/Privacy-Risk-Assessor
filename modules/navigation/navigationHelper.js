import puppeteer from "puppeteer-extra";
import { executablePath } from "puppeteer";
//import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { URLHelper } from "./urlHelper.js";
import moment from "moment";

export { NavigationHelper };

class NavigationHelper {

  requestIdToDateMap = new Map();

  async configureBrowser(userAgent) {
    return await puppeteer.launch({
      headless: true,
      executablePath: executablePath(),
      args: [`--user-agent=${userAgent}`],
    });
  }

  replaceNavigatorProperties(targetObject, userAgent) {
    Object.defineProperty(targetObject.navigator, "userAgent", {
      get: () => userAgent,
    });
    Object.defineProperty(targetObject.navigator, "platform", {
      get: () => "Win32",
    });
    Object.defineProperty(targetObject.navigator, "productSub", {
      get: () => "20100101",
    });
    Object.defineProperty(targetObject.navigator, "vendor", { get: () => "" });
    Object.defineProperty(targetObject.navigator, "oscpu", {
      get: () => "Windows NT 10.0; Win64; x64",
    });
  }

  delayedBrowserClose(browser, delay) {
    return new Promise(resolve => {
      setTimeout(async () => {
        await browser.close();
        resolve();
      }, delay);
    });
  }

  processResponseCookies(visitResponse){
    const setCookieHeaders = visitResponse.headers()['set-cookie'];
    const requestCookies = [];
    if (setCookieHeaders) {
      // Split the Set-Cookie header into individual cookies
      const cookies = setCookieHeaders.split(/,\s*(?=[^;]+=[^;]+;)/);
      
      cookies.forEach(header => {
        // Use a RegExp to extract the cookie's name, value, and domain
        const cookieRegex = /([^;=\s]+)=([^;]*);.*expires=([^;]*);.*domain=([^;]*);/i;
        const match = cookieRegex.exec(header);
  
        if (match) {
          const [, cookieName, cookieValue, cookieExpires, cookieDomain] = match;
          requestCookies.push({
            name: cookieName,
            value: cookieValue,
            expires: new Date(cookieExpires),
            domain: cookieDomain
          });
        }
      });
    }
    return requestCookies;
  }

  processRequest(interceptedRequest){
    const requestURL = interceptedRequest.url();
    const requestDetails = {
      fullUrl: requestURL,
      urlWithoutParams: URLHelper.trimUrlToRemoveParameters(requestURL),
      domainName: URLHelper.trimUrlToSecondLevelDomain(requestURL),
      headers: interceptedRequest.headers(),
      method: interceptedRequest.method(),
      postData: interceptedRequest.postData()?.replace(/[^\x00-\x7F]+/g, ''),
      canvasFingerprint: requestURL.includes("iVBORw0KGgoAAAANSUhEUg"),
      executionTime: interceptedRequest.startTime ? new Date() - interceptedRequest.startTime : null
    };
    return requestDetails;
  }

  async visitPageAndInterceptURLs(url) {
    //Fake user agent is built using:
    //https://filipvitas.medium.com/how-to-set-user-agent-header-with-puppeteer-js-and-not-fail-28c7a02165da
    //https://scrapingant.com/blog/puppeteer-tricks-to-avoid-detection-and-make-web-scraping-easier
    const fakeUserAgent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:73.0) Gecko/20100101 Firefox/73.0";
    //puppeteer.use(StealthPlugin());
    const browser = await this.configureBrowser(fakeUserAgent);

    this.delayedBrowserClose(browser, 10000);

    browser.on("targetcreated", async (target) => {
      const createdPage = await target.page();
      await createdPage?.setUserAgent(fakeUserAgent);
    });

    browser.on('disconnected', () => {
      console.log(`[${moment().format("DD.MM.YYYY HH:MM:ss")}] (${url}) Disconnecting`);
    });

    const page = (await browser.pages())[0];

    const siteVisit = new Object();
    siteVisit.domainName = URLHelper.trimUrlToSecondLevelDomain(url);

    if (page && !page.isClosed() && page.target()) {
      // The page is still open and the target exists
      page.canvasFingerprintingDetected = false;
      // const page = (await browser.pages())[0];
      // const urlSecondLevelDomain = URLHelper.trimUrlToSecondLevelDomain(url);
      // //Faking User Agent
      await page.evaluateOnNewDocument((fakeUserAgent) => {
        //faking window.open
        let open = window.open;
        //faking navigator in a new page
        window.open = (...args) => {
          let newPage = open(...args);
          replaceNavigatorProperties(newPage, fakeUserAgent);
        };
        //faking navigator in an original page
        replaceNavigatorProperties(this, fakeUserAgent);
  
        //overriding canvas finegrprint attempt
        const originalCanvasToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = (type) => {
          console.log(`[${moment().format("DD.MM.YYYY HH:MM:ss")}] (${url}) Canvas.toDataURL.`);
          if (type.indexOf("image") > -1) {
            // this is likely a fingerprint attempt, return fake fingerprint
            return `data:${type};base64,iVBORw0KGgoAAAANSUhEUgAAANwAAAAeCAAAAABiES/iAAACeElEQVRYw+2YzUtUURjGf47OmDPh5AyFomUiEeEmyghXtWsh4dcswlYV2KYWfZh/QRBUVLhTCCJXEgmKUCIkFhJREARBkbkyKBlTRmUC82lxZ7z3TjM4whwXwz2ry3vO87znx33Pey4XFfHAg/PgPDgPzoPz4Dy4rFIKscSkAfmnsUY+iTfXFhxue4Zm4QpfaKbg8k+EsZNsGG6iNVzRMrkZeRPmjp6eCgcae5f+3wJIgtWLldG+DUnfzoail1etaVsEa1f2lUqw2hPd3T7nCrkMtlkQ24YDwP8+FZkI+gY3uq2cTcu54GIA/dJCDUAnSE4RdAESdALUxZ0hl4E5OMs49iE528E5a+cj5YFhDVI3vLA2c4K+zLXpvR37tNRDs3STg1OJqXqQSwS14wlJUD+VeHWAW86Qy8BwQ5Ek/WK/JBgqC72UTvJakmY5lAvurTRPSDrMmKRRcIvgeUo2KmmEI86Qy8DwmVu/ezQIBCSBLzwjKZhujv5cZZmUNkAq57ekRXCLYDG12pre5Qy5DAzDXbPfIOB/JqmCzNafCZd+dMA5RfZxdsBlNTAMF+FJfD2eSvSI0iGpmXe5GnbG3qyyHAO3yCZxlGV2uBLWDcJVMZKc7UrnfIBvQI+pHpxbS34ZaNkK7gYN0yvTDSCXyCZxNJTscFFe/DUH1w3QvpnzPiUPdTXfsvxZDdBGmeQU2SQd9lWQHS5m9J6Ln4/suZCwc96D25qM1formq5/3ApOX1uDkZ7P7JXkENkkK5eqQm3flRtuvitSYgCucKOf0zv01bazcG3Tyz8GKukvSjjrlB3/U5Rw42dqAo29yypKOO8figeX1/gH+zX9JqfOeUwAAAAASUVORK5CYII=`;
          }
          // otherwise, just use the original function
          return originalCanvasToDataURL.apply(this, arguments);
        };
        const originalToBlob = HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob = function(...args) {
          console.log(`[${moment().format("DD.MM.YYYY HH:MM:ss")}] (${url}) Canvas.toBlob.`);
          // Perform any additional logic or handling here
          return originalToBlob.apply(this, args);
        };
      
        const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        CanvasRenderingContext2D.prototype.getImageData = function(...args) {
            console.log(`[${moment().format("DD.MM.YYYY HH:MM:ss")}] (${url}) Canvas.getImageData.`);
            // Perform any additional logic or handling here
            // You might want to return altered or constant image data here to mitigate fingerprinting
            return originalGetImageData.apply(this, args);
        };
      }, fakeUserAgent);
  
      // await page.setUserAgent(fakeUserAgent);
      //EOF Fakeing User Agent
      siteVisit.requests = [];
  
      // await page.setRequestInterception(true);
      // page.on("request", intercaptedRequest => {

      // });

      page.on('response', async(response) => {
        const cookies = this.processResponseCookies(response);
        const requestDetails = this.processRequest(response.request());
        if (requestDetails) {
          if (cookies.length > 0) {
            requestDetails.cookies = cookies;
          }
          siteVisit.requests.push(requestDetails);
        }
      });

      page.on('request', async(request) => {
        request.startTime = new Date();
        // this.requestIdToDateMap.set(request._requestId, new Date());
      });

      try {
        console.log(`[${moment().format("DD.MM.YYYY HH:MM:ss")}] (${url}): Visiting.`);
        let visitResponse = null;
        try {
          visitResponse = await page.goto(url);
        } catch (error) {
          console.error(`[${moment().format("DD.MM.YYYY HH:MM:ss")}] (${url}):  Failed to visit the page: ${error.message}`);
          return {
            domainAddress: url,
            accessible: false,
            error: error.message
          };
        }

        if (visitResponse) {
          this.processResponseCookies(visitResponse);
        }

        let pageLocalStorage = {};
        try {
          pageLocalStorage = await page.evaluate(() =>
            JSON.stringify(window.localStorage)
          );
        } catch (error) {
          console.log(`[${moment().format("DD.MM.YYYY HH:MM:ss")}] (${url}): Local Strorage retrieval failure: '${error.message}'`);
        }
  
        const frames = await page.frames();
        const siteFrames = [];
        frames.forEach(frame => {
          const frameUrl = frame.url();
          if (frameUrl!== 'about:blank' && frameUrl !== url) {
              const siteFrame = {
                url: frameUrl,
                domainName: URLHelper.trimUrlToSecondLevelDomain(frameUrl)
              };
              frame.evaluate(() => {
                  JSON.stringify(window.localStorage)
                }
              ).then(frameLocalStorage => {
                    siteFrame.localStorage = frameLocalStorage;
              }).catch(error => {
                console.log(`[${moment().format("DD.MM.YYYY HH:MM:ss")}] (${frameUrl}) Frame: '${error.message}'`);
              });
              siteFrames.push(siteFrame);
          }
        });
        siteVisit.frames = siteFrames;

        const client = await page.target().createCDPSession();
        siteVisit.cookies = (await client.send("Network.getAllCookies")).cookies;
        
        siteVisit.localStorage = JSON.parse(pageLocalStorage);
        siteVisit.accessible = true;
        siteVisit.error = '';
      } catch (error) {
        siteVisit.accessible = false;
        siteVisit.error = error.message;
        console.log(`[${moment().format("DD.MM.YYYY HH:MM:ss")}] (${url}): puppeteer failure: '${error.message}'`);
      } 
      finally {
        this.delayedBrowserClose(browser, 15000);
      }
    } else {
      console.log(`[${moment().format("DD.MM.YYYY HH:MM:ss")}] (${url}) Puppeteer page was closed, can't proceed.`);
    }
    return siteVisit;
  }
}
