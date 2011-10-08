var http = require('http'),
    url = require('url'),
    fs = require('fs'),
    noplan = require('./noplan.js');

console.log("Reading settings from noplan_settings.json...");
var mNoPlanSettings = JSON.parse(fs.readFileSync('noplan_settings.json', 'utf8')),
    mPlanUrls = {};
console.log("Done.");

console.log("Setting up plans...");
for (var i = 0, il = mNoPlanSettings.plans.length; i < il; i++) {
    var plan = noplan.load(mNoPlanSettings.plans[i]);
    plan.load(function(pPlan) {
        mPlanUrls[pPlan.urlPath] = pPlan;
        console.log("Loaded plan '" + pPlan.name + "' at path '" + pPlan.urlPath + "'.");
    });
}

function requestHandler(pRequest, pResponse) {
    var urlInfo = url.parse(pRequest.url, true),
        path = urlInfo.pathname;

    path = path.split('/');
    console.log("REQUEST", path);
    if (path.length < 3) {
        pResponse.writeHead(404);
        pResponse.end();
    } else {
        switch (path[1]) {
            case 'plans':
                var planPath = path[2];
                if (!(planPath in mPlanUrls)) {
                    pResponse.writeHead(404);
                    pResponse.end();
                } else {
                    if (path.length === 3) {
                        try {
                            var file = fs.readFileSync('templates/plan.html', 'utf8');
                            pResponse.writeHead(200, {'Content-Type': 'text/html'});
                            pResponse.end(file);
                        } catch (e) {
                            console.error(e);
                            pResponse.writeHead(500, "Couldn't find plan template!");
                            pResponse.end();
                        }
                    } else {

                    }
                }
                break;
            case 'templates':
                if (path.length !== 3) {
                    pResponse.writeHead(404);
                    pResponse.end();
                } else {
                    try {
                        var file = fs.readFileSync('templates/' + path[2] + '.html', 'utf8');
                        pResponse.writeHead(200, {'Content-Type': 'text/html'});
                        pResponse.end(file);
                    } catch (e) {
                        console.error(e);
                        pResponse.writeHead(404);
                        pResponse.end();
                    }
                }
                break;
            case 'styles':
                try {
                    path.splice(0, 2);
                    var file = fs.readFileSync('styles/' + path.join('/'), 'utf8');
                    pResponse.writeHead(200, {'Content-Type': 'text/css'});
                    pResponse.end(file);
                } catch (e) {
                    console.error(e);
                    pResponse.writeHead(404);
                    pResponse.end();
                }
                break;
            case 'js':
                try {
                    path.splice(0, 2);
                    var file = fs.readFileSync('js/' + path.join('/'), 'utf8');
                    pResponse.writeHead(200, {'Content-Type': 'text/javascript'});
                    pResponse.end(file);
                } catch (e) {
                    console.error(e);
                    pResponse.writeHead(404);
                    pResponse.end();
                }
                break;
            default:
                pResponse.writeHead(404);
                pResponse.end();
                break;
        }
    }
}

console.log("Starting server up at " + mNoPlanSettings.server.host + ":" + mNoPlanSettings.server.port + "...");
http.createServer(requestHandler).listen(mNoPlanSettings.server.port, mNoPlanSettings.server.host);
console.log('Up and running!');
