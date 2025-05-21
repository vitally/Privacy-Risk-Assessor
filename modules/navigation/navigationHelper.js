import puppeteer from "puppeteer-extra";
import { executablePath } from "puppeteer";
//import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { URLHelper } from "./urlHelper.js";
import { DateTime } from 'luxon';

export { NavigationHelper };

class NavigationHelper {

  async configureBrowser(userAgent) {
    return await puppeteer.launch({
      headless: "new",
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
            expiresInDays: ((new Date(cookieExpires)).getTime() - new Date().getTime()) / (1000 * 3600 * 24),
            domainName: cookieDomain.replace(/^\./, '')
          });
        }
      });
    }
    return requestCookies;
  }

  processRequest(interceptedRequest){
    const requestURL = interceptedRequest.url();
    const cookie = interceptedRequest.headers()['cookie'];
    if (cookie) {
      // You have the cookie header here, compare it with the initial cookies or monitored changes
      console.log(`Cookies sent in request to ${interceptedRequest.url()}:`, cookie);
      // Here, you can check if any of the previously captured or set cookies are included in this header
    }
    const requestDetails = {
      fullUrl: requestURL,
      urlWithoutParams: URLHelper.trimUrlToRemoveParameters(requestURL),
      domainName: URLHelper.trimUrlToSecondLevelDomain(requestURL),
      parameters: URLHelper.extractUrlParams(requestURL),
      headers: interceptedRequest.headers(),
      method: interceptedRequest.method(),
      postData: interceptedRequest.postData()?.replace(/[^\x00-\x7F]+/g, ''),
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
      console.log(`[${DateTime.now().toFormat('dd.MM.yyyy HH:mm:ss')}] (${url}) Disconnecting`);
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
          console.log(`[${DateTime.now().toFormat('dd.MM.yyyy HH:mm:ss')}] (${url}) Canvas.toDataURL.`);
          // if (type.indexOf("image") > -1) {
          //   // this is likely a fingerprint attempt, return fake fingerprint
          //   return `data:${type};base64,iVBORw0KGgoAAAANSUhEUgAAANwAAAAeCAAAAABiES/iAAACeElEQVRYw+2YzUtUURjGf47OmDPh5AyFomUiEeEmyghXtWsh4dcswlYV2KYWfZh/QRBUVLhTCCJXEgmKUCIkFhJREARBkbkyKBlTRmUC82lxZ7z3TjM4whwXwz2ry3vO87znx33Pey4XFfHAg/PgPDgPzoPz4Dy4rFIKscSkAfmnsUY+iTfXFhxue4Zm4QpfaKbg8k+EsZNsGG6iNVzRMrkZeRPmjp6eCgcae5f+3wJIgtWLldG+DUnfzoail1etaVsEa1f2lUqw2hPd3T7nCrkMtlkQ24YDwP8+FZkI+gY3uq2cTcu54GIA/dJCDUAnSE4RdAESdALUxZ0hl4E5OMs49iE528E5a+cj5YFhDVI3vLA2c4K+zLXpvR37tNRDs3STg1OJqXqQSwS14wlJUD+VeHWAW86Qy8BwQ5Ek/WK/JBgqC72UTvJakmY5lAvurTRPSDrMmKRRcIvgeUo2KmmEI86Qy8DwmVu/ezQIBCSBLzwjKZhujv5cZZmUNkAq57ekRXCLYDG12pre5Qy5DAzDXbPfIOB/JqmCzNafCZd+dMA5RfZxdsBlNTAMF+FJfD2eSvSI0iGpmXe5GnbG3qyyHAO3yCZxlGV2uBLWDcJVMZKc7UrnfIBvQI+pHpxbS34ZaNkK7gYN0yvTDSCXyCZxNJTscFFe/DUH1w3QvpnzPiUPdTXfsvxZDdBGmeQU2SQd9lWQHS5m9J6Ln4/suZCwc96D25qM1formq5/3ApOX1uDkZ7P7JXkENkkK5eqQm3flRtuvitSYgCucKOf0zv01bazcG3Tyz8GKukvSjjrlB3/U5Rw42dqAo29yypKOO8figeX1/gH+zX9JqfOeUwAAAAASUVORK5CYII=`;
          // }
          fetch('http://localhost:3000/api/sites/fingerprint', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: document.location.href,
              type: 'Canvas.toDataURL',
              canvasWidth: this.width,
              canvasHeight: this.height,
              dataURLTypeArg: arguments.length > 0 ? arguments[0] : null
            }),
          });
          // otherwise, just use the original function
          return originalCanvasToDataURL.apply(this, arguments);
        };
        const originalToBlob = HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob = function(...args) {
          fetch('http://localhost:3000/api/sites/fingerprint', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: document.location.href,
              type: 'Canvas.toBlob',
              canvasWidth: this.width,
              canvasHeight: this.height,
              blobMimeType: arguments.length > 1 ? arguments[1] : null,
              blobQuality: arguments.length > 2 ? arguments[2] : null
            }),
          });
          return originalToBlob.apply(this, args);
        };
      
        const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        CanvasRenderingContext2D.prototype.getImageData = function(...args) {
            fetch('http://localhost:3000/api/sites/fingerprint', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                url: document.location.href,
                type: 'Canvas.getImageData',
                canvasWidth: this.canvas.width,
                canvasHeight: this.canvas.height,
                sx: arguments.length > 0 ? arguments[0] : 0,
                sy: arguments.length > 1 ? arguments[1] : 0,
                sw: arguments.length > 2 ? arguments[2] : this.canvas.width,
                sh: arguments.length > 3 ? arguments[3] : this.canvas.height
              }),
            });
            return originalGetImageData.apply(this, args);
        };

        const originalFillText = CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText = function(...args) {
            const payload = {
                url: document.location.href,
                type: 'Canvas.fillText',
                text: args.length > 0 ? args[0] : null,
                x: args.length > 1 ? args[1] : null,
                y: args.length > 2 ? args[2] : null,
                maxWidth: args.length > 3 ? args[3] : null,
                font: this.font,
                textAlign: this.textAlign,
                textBaseline: this.textBaseline,
            };
            fetch('http://localhost:3000/api/sites/fingerprint', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            return originalFillText.apply(this, args);
        };

        const originalStrokeText = CanvasRenderingContext2D.prototype.strokeText;
        CanvasRenderingContext2D.prototype.strokeText = function(...args) {
            const payload = {
                url: document.location.href,
                type: 'Canvas.strokeText',
                text: args.length > 0 ? args[0] : null,
                x: args.length > 1 ? args[1] : null,
                y: args.length > 2 ? args[2] : null,
                maxWidth: args.length > 3 ? args[3] : null,
                font: this.font,
                textAlign: this.textAlign,
                textBaseline: this.textBaseline,
            };
            fetch('http://localhost:3000/api/sites/fingerprint', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            return originalStrokeText.apply(this, args);
        };

        const originalCookieSetter = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie').set;
        Object.defineProperty(document, 'cookie', {
          set: function(value) {
            fetch('http://localhost:3000/api/sites/fingerprint', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ url: document.location.href, type: 'cookie', value: value }),
            });
            console.log('COOKIE');
            return originalCookieSetter.apply(this, arguments); // Call the original setter
          }
        });

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
      });

      page.on('console', (msg) => {
        console.log(`[${DateTime.now().toFormat('dd.MM.yyyy HH:mm:ss')}] (${url}): PAGE LOG "${msg.text()}"`);
      });

      try {
        console.log(`[${DateTime.now().toFormat('dd.MM.yyyy HH:mm:ss')}] (${url}): Visiting.`);
        let visitResponse = null;
        try {
          visitResponse = await page.goto(url);
        } catch (error) {
          console.error(`[${DateTime.now().toFormat('dd.MM.yyyy HH:mm:ss')}] (${url}):  Failed to visit the page: ${error.message}`);
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
          console.log(`[${DateTime.now().toFormat('dd.MM.yyyy HH:mm:ss')}] (${url}): Local Strorage retrieval failure: '${error.message}'`);
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
                console.log(`[${DateTime.now().toFormat('dd.MM.yyyy HH:mm:ss')}] (${frameUrl}) Frame: '${error.message}'`);
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
        console.log(`[${DateTime.now().toFormat('dd.MM.yyyy HH:mm:ss')}] (${url}): puppeteer failure: '${error.message}'`);
      } 
      finally {
        this.delayedBrowserClose(browser, 15000);
      }
    } else {
      console.log(`[${DateTime.now().toFormat('dd.MM.yyyy HH:mm:ss')}] (${url}) Puppeteer page was closed, can't proceed.`);
    }
    return siteVisit;
  }
}
