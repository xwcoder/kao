/* 
 * mb.js 
 * https://github.com/xwcoder/MessageBus
 */
(function(window, undefined){
    var id = 1;
    var toString = Object.prototype.toString;
    
    var applyIf = function(o, c) {
        if (o) {
            for (var p in c) {
                typeof o[p] === 'undefined' && (o[p] = c[p]);
            }
        }
        return o;
    };

    var generateId = function(prefix){
        return (prefix || '') + id++;
    };

    var throwException = function(msg){
        throw new Error(msg);
    };

    var illegalTopic = function(topic){
        throwException('illegalTopic:' + topic);
    };

    var checkSubTopic = function(topic){
        (!topic || !topic.length || toString.call(topic) != '[object String]' 
            || /\*{2}\.\*{2}/.test(topic)
            || /([^\.\*]\*)|(\*[^\.\*])/.test(topic)
            || /(\*\*\.\*)|(\*\.\*\*)/.test(topic)
            || /\*{3}/.test(topic) || /\.{2}/.test(topic)
            || topic[0] == '.' || topic[topic.length-1] == '.') && illegalTopic(topic);
    };

    var checkIllegalCharactor = function(topic){
        var m = /[^a-zA-Z0-9-_\.\*]/.exec(topic);
        if(m){
            throwException('illegalCharactor:' + m[1]);
        }
    };

    var checkPubTopic = function(topic){
        (!topic || !topic.length || toString.call(topic) != '[object String]' 
            || topic.indexOf('*') != -1 || topic[0] == '.' 
            || /\.{2}/.test(topic)
            || topic[topic.length] == '.') && illegalTopic(topic);
    };

    var doCall = function(topic, msg, handlers, pubId) {
        msg = msg || null;
        var wrapFn, config;
        var checkWait = function(_topics, topics, topic, msg) {
            var r = true;
            topics[topic] = msg;
            _topics[topic] = true;
            for (var t in _topics) {
                if (!_topics[t]) {
                    r = false;
                    break;
                }
            }
            return r;
        };

        var clearWait = function(_topics, topics) {
            for (var t in _topics) {
                _topics[t] = false;
            }
        };

        for (var i = 0, len = handlers.length; i < len; i++) {
            wrapFn = handlers[i];
            if (wrapFn && (typeof pubId === 'undefined' || wrapFn.pubId !== pubId)) {
                wrapFn.pubId = pubId;
                config = wrapFn.config;
                       
                if (config && config._topics) {
                    if (checkWait(config._topics, config.topics, topic, msg)) {
                        clearWait(config._topics, config.topics);
                        wrapFn.h.call(wrapFn.scope, topic, config.topics , wrapFn.data);
                    }
                } else {
                    wrapFn.execedTime++;
                    if (toString.call(wrapFn.config.execTime) == '[object Number]'
                            && wrapFn.execedTime >= wrapFn.config.execTime) {
                        handlers.splice(i--,1);
                        len = handlers.length;
                    }
                    wrapFn.h.call(wrapFn.scope, topic, msg, wrapFn.data);
                }
            }
        }
    };

    var deleteWrapFn = function(h, id){
        for(var i = 0, len = h.length; i < len; i++){
            if(h[i].sid == id){
                h.splice(i,1);
                break;
            }
        }
    };

    var match = function(p, t){
        if(p == t || t == '**'){
            return true;
        }
        t = t.replace(/\.\*\*\./g,'(((\\..+?\\.)*)|\\.)');
        t = t.replace(/^\*\*\./,'(.+?\\.)*');
        t = t.replace(/\.\*\*$/,'(\\..+?)*');

        t = t.replace(/\.\*\./g,'(\\..+?\\.)');
        t = t.replace(/^\*\./g,'(.+?\\.)');
        t = t.replace(/\.\*$/g,'(\\..+?)');

        return new RegExp(t).test(p);
    };

    var query = function(topic, pubItems) {
        var msgs = [];
        for(var p in pubItems){
            if(match(p, topic)){
                msgs.push({topic : p, value : pubItems[p]});
            }
        }
        return msgs;
    };

    var defaults = {
        cache : true
    };

    function MessageBus(c) {
        c = c || {};
        this.config = applyIf(c, defaults);
        this.subTree = {t:{},h:[]};
        this.pubItems = {};
    }

    applyIf(MessageBus.prototype, {
        version : '1.0',

        subscribe : function(topic, handler, scope, data, config) {
            checkSubTopic(topic); 
            checkIllegalCharactor(topic);
            scope = scope || window;
            config = config || {};

            var sid = generateId();
            var wrapFn = {h : handler, scope : scope, data : data, sid : sid, execedTime : 0, config : config};
            var path = topic.split('.'), i = 0, len = path.length;
            
            (function(path, index, handler, tree){
                var token = path[index];
                if(index == path.length){
                    tree.h.push(handler); 
                }else{
                    if(!tree.t[token]){
                        tree.t[token] = {t:{}, h:[]};
                    }
                    arguments.callee.call(this, path, ++index, handler, tree.t[token]);
                }
            })(path, 0, wrapFn, this.subTree);

            if(this.config.cache && !!config.cache){
                var msgs = query(topic, this.pubItems);
                for(i = 0, len = msgs.length; i < len; i++){
                    doCall(msgs[i].topic, msgs[i].value, [wrapFn]);
                }
            }
            return topic + '^' + sid;
        },

        publish : function(topic, msg) {
            checkPubTopic(topic);
            checkIllegalCharactor(topic);

            this.pubItems[topic] = msg;

            var path = topic.split('.');
            var token;

            (function(path, index, tree, msg, topic, pubId, seed){
                var token = path[index];
                if(index == path.length){
                    doCall(topic, msg, (seed && seed.isWildcard) ? tree.t['**'].h : tree.h, pubId);
                }else{
                    if(tree.t['**']){
                        if(tree.t['**'].t[token]){
                            arguments.callee.call(this, path, index + 1, tree.t['**'].t[token], msg, topic, pubId, {index : index, tree:tree});
                        }else{
                            arguments.callee.call(this, path, index + 1, tree, msg, topic, pubId, {isWildcard : true});
                        }
                    }
                    if(tree.t[token]){
                        arguments.callee.call(this, path, index + 1, tree.t[token], msg, topic, pubId);
                    }else if(seed && !seed.isWildcard){
                        arguments.callee.call(this, path, ++seed.index, seed.tree, msg, topic, pubId, seed);
                    }
                    if(tree.t['*']){
                        arguments.callee.call(this, path, index + 1, tree.t['*'], msg, topic, pubId);
                    }
                }
            })(path, 0, this.subTree, msg, topic, generateId());
        },

        unsubscribe : function(sids) {
            var me = this;

            var unsubscribe = function(sid) {
                var sid = sid.split('^');
                if(sid.length != 2){
                    throwException('illegal sid:' + sid);
                }
                var path = sid[0].split('.');
                var id = sid[1];
                (function(path, index, tree, id){
                    var token = path[index];
                    if(index == path.length){
                        deleteWrapFn(tree.h, id);
                    }else{
                        if(tree.t[token]){
                            arguments.callee.call(this, path, ++index, tree.t[token], id);
                        }            
                    }
                })(path, 0, me.subTree, id);
            };

            var sids = sids.split(';');
            var i = 0, len = sids.length;
            for (; i < len; i++) {
                unsubscribe(sids[i]);
            }
        },

        wait : function(topics, handler, scope, data, config) {
            if (toString.call(topics) !== '[object Array]' || !topics.length) {
                return;
            } 
            
            config = config || {};
            config.topics = {};
            config._topics = {};
            var sids = [];

            var i = 0, len = topics.length, topic;
            for (; i < len; i++) {
                topic = topics[i];
                checkPubTopic(topics[i]);
                config.topics[topic] = null;
                config._topics[topic] = false;
            }

            for (i = 0; i < len; i++) {
                sids.push(this.subscribe(topics[i], handler, scope, data, config)); 
            }
            return sids.join(';');
        }
    });
    
    window.messagebus = new MessageBus();
    window.MessageBus = MessageBus;
})(window, undefined);

/*
 *2012-07-4
 *我决定放弃支持模块了，回到我最开始的设计：实现文件加载和依赖管理。
 *一个晚上的时间证明：糅合文件和模块的想法是行不通的o(╯□╰)o
 */

(function (window, document) {
    var mb = new MessageBus();
    var slice = Array.prototype.slice;
    var toString = Object.prototype.toString;
    var ext;
    var gid = 0;

    var getAnonyModuleName = function () {
        return 'kao-anony-mod' + ++gid;
    };
    
    var throwException = function(msg){
        throw new Error(msg);
    };

    var script = function () {
        var scripts = document.getElementsByTagName('script');
        var i = 0, len = scripts.length, script;
        var reg = /kao\.js(?=[\?#]|$)/;
        for (; i < len; i++) {
            script = scripts[i];
            if (reg.exec(script.getAttribute('src') || '')) {
                break;
            }
            script = null;
        }
        return script;
    }();

    var isScript = function (filename) {
        filename = filename || '';
        return !!/\.js(?=[\?#]|$)/i.exec(filename);
    };

    var isCss = function (filename) {
        filename = filename || '';
        return !!/\.css(?=[\?#]|$)/i.exec(filename);
    };

    var isFunction = function (fn) {
        return fn && toString.call(fn) === '[object Function]';
    };

    var isString = function (s) {
        return s && toString.call(s) === '[object String]';
    };

    var isArray = function (a) {
        return a && toString.call(a) === '[object Array]';
    };

    var isObject = function (o) {
        return o && toString.call(o) === '[object Object]';
    };
    

    var apply = function (o, c) {
        if (o && c) {
            for (var p in c) {
                o[p] = c[p];
            }
        }
    };

    var config = {
        baseURL : 'http://tv.sohu.com/upload/',

        coreLib : 'http://tv.sohu.com/upload/jq_plugin/j.js'
    };

    var loaded = {};

    var loading = {};

    var modules = {};
    
    var getModule = function (name) {
        var mod;
        if (isString(name)) {
            mod = modules[name];
        }
        return mod;
    };

    var getUrl = function (path) {
        path = path || '';
        if (!/^http(s)?:\/\//.exec(path)) {
            path = config.baseURL + path;
        }
        return path;
    };

    var loadCss = function (url, charset) {
        var node = document.createElement('link');
        node.setAttribute('type', 'text/css');
        node.setAttribute('rel', 'stylesheet');
        node.setAttribute('href', url);

        if (charset) {
            node.charset = charset;
        }
        
        script.parentNode.insertBefore(node, script);
    };

    var load = function (modName, url, type, charset, fn) {
        url = getUrl(url);
        var topic = url.replace(/[\/:]/g, '');
        var node, sid;

        var iscss = type === 'css' || isCss(url);

        if (iscss) {
            loadCss(url, charset);
            return;
        }

        if (loaded[url]) {
            fn && fn();
            modName && mb.publish(modName);
            return;
        } else {
            sid = mb.subscribe(topic, function () {
                fn && fn();
                modName && mb.publish(modName);
            }, this, null, {execTime : 1});
        }

        if (loading[url]) {
            return;
        }
        
        loading[url] = 1;

        node = document.createElement('script');
        node.setAttribute('type', 'text/javascript');
        node.setAttribute('src', url);
        node.setAttribute('async', true);
        if (charset) {
          node.charset = charset;
        }

        node.onerror = function() {
            mb.unsubscribe(sid);
            loading[url] = 0;
            node.onerror = null;
        };
        var done = false
        node.onload = node.onreadystatechange = function() {
            if (!done && (!this.readyState || this.readyState === 'loaded' 
                    || this.readyState === 'complete')) {
                done = true;
                node.onload = node.onreadystatechange = null;

                loaded[url] = 1;
                loading[url] = 0;
                mb.publish(topic);
            }
        };

        script.parentNode.insertBefore(node, script);
    };

    var loadOrder = function (deps, fn) {
        var modNames = createModules(deps);

        var modName, mod, i = 0;
        var sid;

        sid = mb.wait(modNames, function () {
            mb.unsubscribe(sid);
            fn && fn();
        }, this);

        while(modName = modNames[i++]){
            mod = getModule(modName);
            if (mod.requires && mod.requires.length) {
                loadOrder(mod.requires, (function (modName, mod) {
                    return function (){
                        load(modName, mod.path, mod.type, mod.charset);
                    }   
                })(modName, mod));
            } else {
                load(modName, mod.path, mod.type, mod.charset);
            }
        };
    };

    var createModules = function (mods, names) {
        names = names || [];
        var mod, i = 0;
        while (mod = mods[i++]) {

            if (isString(mod)) {

                if (modules[mod]) {

                    names.push(mod);

                } else if (isScript(mod) || isCss(mod)) {

                    name = getAnonyModuleName();
                    kao.add(name, {path : mod});
                    names.push(name);

                }
            } else if (isObject(mod) && mod.path){

                name = getAnonyModuleName();
                kao.add(name, mod);
                names.push(name);
            } 
        }
        return names;
    };

    //kao(function(){});
    //kao(false, function(){});
    //kao('jq_plugin/g.js', function(){});
    //kao('mod1', function(){});
    //kao('mod1', 'mod2', function(){});
    //kao({path : 'js/g.js', requires : [], charset:'utf-8'}, function(){});
    //kao('mod1', 'js/g.js', 'mod2', {path : 'js/gNav.js', requires : []}, function(){});
    //kao(false, 'mod1', 'js/g.js', 'mod2', {path : 'js/gNav.js', requires : []});
    //kao('mod3', function(){});
    var kao = function () {
        var args = slice.call(arguments); 
        var fn;
        var requireCore = true;

        if (args[0] === false) {
            requireCore = args.shift();
        }
        
        if (isFunction(args[args.length - 1])) {
            fn = args.pop();
        }

        if (requireCore) {
            load('kao-corelib', getModule('kao-corelib').path, null, null, (function (args, fn) {
                return function () {
                    if (!args || !args.length) {
                        fn && fn();
                    } else {
                        loadOrder(args, fn);
                    }
                }
            })(args, fn));
        } else {
            if (!args || !args.length) {
                fn && fn();
            } else {
                loadOrder(args, fn);
            }
        }
    };

    apply(kao, {
        //add(name, 'js/jNav.js');
        //add(name, {path:'js/g.js', requires:[], charset : '', type : js});
        add : function (modName, config) {
            var mod;
            if (!isString(modName)) {
                return;
            }

            if (isString(config)) {
                mod = {path : config};
            } else if (isObject(config) && config.path) {
                mod = config;
            }

            if (mod) {
                modules[modName] = mod;
            }
        },

        setConfig : function (o) {
            apply(config, o);
        }
    });

    window.kao = kao;

    if (ext = script.getAttribute('data-corelib')) {
        config.coreLib = ext;
    }

    modules['kao-corelib'] = { path : config.coreLib }

    if (ext = script.getAttribute('data-main')) {
        if (script.getAttribute('data-main-needcore') === 'false') {
            kao(false, ext);
        } else {
            kao(ext);
        }
    }
})(window, document);
