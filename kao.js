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
