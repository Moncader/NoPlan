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
                    } else if (pRequest.method === 'POST' && path[3] === 'api') {
                    	var data = '';
                    	pRequest.on('data', function(d) {
                    		data += d.toString();
                    	});
                    	pRequest.on('end', function() {
							try {
								data = JSON.parse(data);
							} catch (e) {
								console.error(e);
								pResponse.writeHead(500, "Couldn't parse JSON data!");
								pResponse.end();
								return;
							}
							handleApi(pResponse, mPlanUrls[planPath], data);
                    	});
                    } else {
                    	pResponse.writeHead(404);
                    	pResponse.end();
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

function handleApi(pResponse, pPlan, pData) {
	if (pData instanceof Array) {
		res = [];
		for (var i = 0, il = pData.length; i < il; i++) { // TODO
			res.push(getApiResponse(pPlan, pData[i]));
		}
	} else {
		getApiResponse(pPlan, pData, function(data) {
			try {
				pResponse.writeHead(200, {'Content-Type': 'application/json'});
				pResponse.end(JSON.stringify(data));
			} catch (e) {
				console.error(e);
				pResponse.writeHead(500, "Couldn't stringify JSON data!");
				pResponse.end();
			}
		});
	}
}

var apiHandlers = {
	'p': getApiPlanResponse,
	'n': getApiNodeResponse
};

function getApiResponse(pPlan, pData, handler) {
	if (pData.o in apiHandlers) apiHandlers[pData.o](pPlan, pData, handler);
	else handler(null);
}

function getApiPlanResponse(pPlan, pData, handler) {
	switch (pData.m) {
		case 'get':
			handler({
				id: pPlan.id,
				name: pPlan.name,
				description: pPlan.description,
				locales: pPlan.locales,
				urlPath: pPlan.urlPath
			});
			break;
		case 'getNode':
			pPlan.getNode(
				pData.id,
				true,
				function(node) {
					delete node.plan;
					for (var i = 0, il = node.children.length; i < il; i++) {
						delete node.children[i].plan;
					}
					handler(node);
				},
				function(err) {
					handler({e:err});
				}
			);
			break;
		case 'searchByType':
			pPlan.searchByType(
				pData.type,
				true,
				function(nodes) {
					for (var i = 0, il = nodes.length; i < il; i++) {
						delete nodes[i].plan;
					}
					handler(nodes);
				},
				function(err) {
					handler({e:err});
				}
			);
			break;
		case 'searchByTitle':
			pPlan.searchByTitle(
				pData.title,
				true,
				function(nodes) {
					for (var i = 0, il = nodes.length; i < il; i++) {
						delete nodes[i].plan;
					}
					handler(nodes);
				},
				function(err) {
					handler({e:err});
				}
			);
			break;
		case 'searchByTitleInType':
			pPlan.searchByTitleInType(
				pData.type,
				pData.title,
				true,
				function(nodes) {
					for (var i = 0, il = nodes.length; i < il; i++) {
						delete nodes[i].plan;
					}
					handler(nodes);
				},
				function(err) {
					handler({e:err});
				}
			);
			break;
		default:
			handler(null);
	}
}

function getApiNodeResponse(pPlan, pData, handler) {

}

console.log("Starting server up at " + mNoPlanSettings.server.host + ":" + mNoPlanSettings.server.port + "...");
http.createServer(requestHandler).listen(mNoPlanSettings.server.port, mNoPlanSettings.server.host);
console.log('Up and running!');
