var cradle = require('cradle'),
    fs = require('fs');

function Plan(pData) {
    this.id = pData.id;
    this.name = pData.name;
    this.description = pData.description;
    this.db = new (cradle.Connection)(pData.db.url, pData.db.port).database(this.id);
    this.locales = pData.locales ? pData.locales.slice(0) : ['en_CA'];
    this.locale = this.locales[0];
    this.urlPath = pData.urlPath || pData.id;
}

Plan.prototype.load = function(pOnSuccess, pOnError) {
    var self = this,
        db = self.db;
    db.exists(function(pError, pExists) {
        if (pError) {
            console.error('An error occurred while checking if the noplan database exists', pError);
            if (pOnError) pOnError(self, pError);
        } else if (!pExists) {
            console.log('The database for ' + self.name + ' does not yet exist. Creating...');
            db.create(function(err, res) {
                if (err && pOnError) pOnError(self, err);
                else {
                    console.log('Created database for ' + self.name + '.');
                    initializeDatabase(self, pOnSuccess, pOnError);
                }
            });
        } else {
            if (pOnSuccess) pOnSuccess(self);
        }
    });
    return this;
}

Plan.prototype.destroy = function() {
    this.db.destroy();
    return this;
}

Plan.prototype.import = function(pData) {
    if (typeof pData === "string") {
        pData = JSON.parse(fs.readFileSync(pData, 'utf8'));
    }
    this.db.save(pData, function(err, res) {
        if (err) console.error("Error importing data.");
    });
}

Plan.prototype.get = function(pId, pGetChildren, pOnSuccess, pOnError) {
    var self = this;
    this.db.get(pId, null, function(err, res) {
        if (err && pOnError) pOnError(err, res);
        else if (!err) {
            if (pGetChildren) {
                var node = docToPlanNode(self, res);
                self.db.view('nodes/children', {key: pId, include_docs: true}, function(err, res) {
                    if (err && pOnError) pOnError(err);
                    else if (!err) {
                        node.children.length = 0;
                        for (var i = 0, il = res.length; i < il; i++) {
                            if (res[i].doc) node.children.push(docToPlanNode(self, res[i].doc));
                        }
                        if (pOnSuccess) pOnSuccess(node);
                    }
                });
            } else {
                if (pOnSuccess) {
                    pOnSuccess(docToPlanNode(self, res));
                }
            }
        }
    });
    return this;
}

Plan.prototype.searchByType = function(pType, pGetNode, pSuccess, pError) {
    var self = this;
    self.db.view('nodes/type', {key: pType, include_docs: pGetNode}, function(err, res) {
        if (err && pError) pError(err);
        else if (!err) {
            var nodes = [];
            for (var i = 0, il = res.length; i < il; i++) {
                nodes.push(pGetNode ? docToPlanNode(self, res[i].doc) : res[i]);
            }
            if (pSuccess) pSuccess(nodes);
        }
    });
}

Plan.prototype.searchByTitle = function(pTitle, pGetNode, pSuccess, pError) {
    var self = this;
    this.db.view('nodes/title', {key: pTitle, include_docs: pGetNode}, function(err, res) {
        if (err && pError) pError(err);
        else if (!err) {
            var nodes = [];
            for (var i = 0, il = res.length; i < il; i++) {
                nodes.push(pGetNode ? docToPlanNode(self, res[i].doc) : res[i]);
            }
            if (pSuccess) pSuccess(nodes);
        }
    });
}

Plan.prototype.searchByTitleInType = function(pType, pTitle, pGetNode, pSuccess, pError) {
    var self = this;
    this.db.view('nodes/titleInType', {key: [pType, pTitle], include_docs: pGetNode}, function(err, res) {
        if (err && pError) pError(err);
        else if (!err) {
            var nodes = [];
            for (var i = 0, il = res.length; i < il; i++) {
                nodes.push(pGetNode ? docToPlanNode(self, res[i].doc) : res[i]);
            }
            if (pSuccess) pSuccess(nodes);
        }
    });
}



function docToPlanNode(plan, doc) {
    var node = new PlanNode(plan, doc.type, doc.titles[plan.locale]);
    node._id = doc._id;
    node._rev = doc._rev;
    node.titles = doc.titles;
    node.children = doc.children || [];
    node.data = doc.data || null;
    return node;
}

function PlanNode(pPlan, pType, pTitle) {
    this.plan = pPlan;
    this.type = pType;
    this.titles = {};
    this.titles[pPlan.locale] = pTitle;
    this.children = [];
    this.data = null;
}

PlanNode.prototype.__defineGetter__('title', function() {
    return this.titles[this.plan.locale];
});
PlanNode.prototype.__defineSetter__('title', function(pVal) {
    return this.titles[this.plan.locale] = pVal;
});
PlanNode.prototype.save = function(pOnSuccess, pOnError) {
    var self = this;

    function handle(pError, pResponse) {
        if (pError && pOnError) pOnError(pError, self);
        else if (!pError) {
            self._id = pResponse.id;
            self._rev = pResponse.rev;
            if (pOnSuccess) {
                pOnSuccess(self);
            }
        }
    }

    if (self._id) {
        this.plan.db.save(self._id, {
            type: self.type,
            titles: self.titles,
            children: self.children,
            data: self.data
        }, handle);
    } else {
        this.plan.db.save({
            type: self.type,
            titles: self.titles,
            children: self.children,
            data: self.data
        }, handle);
    }
};
PlanNode.prototype.remove = function(pOnSuccess, pOnError) {
    var self = this;
    if (self._id === undefined) return;
    self.plan.db.view("nodes/parents", {key: self._id}, function(err, res) {
        if (err && pOnError) pOnError(err);
        else if (!err) {
            console.log("RES", res);
            for (var i = 0, il = res.length; i < il; i++) {
                self.plan.db.get(res[i].id, null, function(err, res2) {
                    console.log("RES2", res2);
                    if (err) return;
                    for (var j = 0, jl = res2.children.length; j < jl; j++) {
                        if (res2.children[j] === self._id) {
                            res2.children.splice(j, 1);
                            delete res2._rev;
                            self.plan.db.save(res2);
                            break;
                        }
                    }
                });
            }
        }
    });
    self.plan.db.remove(self._id, null, function(pError, pResponse) {
        if (pError && pOnError) pOnError(pError, self);
        else if (!pError && pOnSuccess) pOnSuccess();
    });
};

function initializeDatabase(pPlan, pOnSuccess, pOnError) {
    console.log('Initializing database for ' + pPlan.name + '...');

    pPlan.db.save('_design/nodes', {
        all: {
            map: function(doc) {
                emit(doc._id, {_id: doc._id});
            }
        },
        type: {
            map: function(doc) {
                emit(doc.type, {_id: doc._id});
            }
        },
        title: {
            map: function(doc) {
                for (var i in doc.titles) {
                    emit(doc.titles[i], {_id: doc._id});
                }
            }
        },
        titleInType: {
            map: function(doc) {
                for (var i in doc.titles) {
                    emit([doc.type, doc.titles[i]], doc.titles);
                }
            }
        },
        parents: {
            map: function(doc) {
                for (var i = 0, il = doc.children.length; i < il; i++) {
                    emit(doc.children[i], {_id: doc._id});
                }
            }
        },
        children: {
            map: function(doc) {
                for (var i = 0, il = doc.children.length; i < il; i++) {
                    emit(doc._id, {_id: doc.children[i]});
                }
            }
        },
        dataKey: {
            map: function(doc) {
                for (var i in doc.data) {
                    emit(i, {_id: doc._id});
                }
            }
        }
    }, function(err, res) {
        if (err && pOnError) pOnError(pPlan, err);
        else if (!err) {
            if (pOnSuccess) pOnSuccess(pPlan);
        }
    });
}




var NoPlan = {
    load: function(pData) {
        if (typeof pData === "string") {
            pData = JSON.parse(fs.readFileSync(pData, 'utf8'));
        }
        return new Plan(pData);
    },
    PlanNode: PlanNode
};

exports = module.exports = NoPlan;
