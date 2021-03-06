var fs = require('fs'),
    noplan = require('./noplan.js');

var mNoPlanSettings = JSON.parse(fs.readFileSync('noplan_settings.json', 'utf8'));
for (var i = 0, il = mNoPlanSettings.plans.length; i < il; i++) {
    var plan = noplan.load(mNoPlanSettings.plans[i]);
	destroyWrapper(plan);
}

function destroyWrapper(plan) {
    plan.destroy(function(err) {
		plan.load(function(pPlan) {
			pPlan.import('./testdata.json');
		});
	});
}

