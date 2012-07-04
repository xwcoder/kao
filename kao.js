/* 
 * mb.js 
 * https://github.com/xwcoder/MessageBus
 */
(function(a,b){function q(a){a=a||{},this.config=e(a,p),this.subTree={t:{},h:[]},this.pubItems={}}var c=1,d=Object.prototype.toString,e=function(a,b){if(a)for(var c in b)typeof a[c]=="undefined"&&(a[c]=b[c]);return a},f=function(a){return(a||"")+c++},g=function(a){throw new Error(a)},h=function(a){g("illegalTopic:"+a)},i=function(a){(!a||!a.length||d.call(a)!="[object String]"||/\*{2}\.\*{2}/.test(a)||/([^\.\*]\*)|(\*[^\.\*])/.test(a)||/(\*\*\.\*)|(\*\.\*\*)/.test(a)||/\*{3}/.test(a)||/\.{2}/.test(a)||a[0]=="."||a[a.length-1]==".")&&h(a)},j=function(a){var b=/[^a-zA-Z0-9-_\.\*]/.exec(a);b&&g("illegalCharactor:"+b[1])},k=function(a){(!a||!a.length||d.call(a)!="[object String]"||a.indexOf("*")!=-1||a[0]=="."||/\.{2}/.test(a)||a[a.length]==".")&&h(a)},l=function(a,b,c,e){b=b||null;var f,g,h=function(a,b,c,d){var e=!0;b[c]=d,a[c]=!0;for(var f in a)if(!a[f]){e=!1;break}return e},i=function(a,b){for(var c in a)a[c]=!1};for(var j=0,k=c.length;j<k;j++){f=c[j];if(typeof e=="undefined"||f.pubId!==e)f.pubId=e,g=f.config,g&&g._topics?h(g._topics,g.topics,a,b)&&(i(g._topics,g.topics),f.h.call(f.scope,a,g.topics,f.data)):(f.execedTime++,d.call(f.config.execTime)=="[object Number]"&&f.execedTime>=f.config.execTime&&(c.splice(j--,1),k=c.length),f.h.call(f.scope,a,b,f.data))}},m=function(a,b){for(var c=0,d=a.length;c<d;c++)if(a[c].sid==b){a.splice(c,1);break}},n=function(a,b){return a==b||b=="**"?!0:(b=b.replace(/\.\*\*\./g,"(((\\..+?\\.)*)|\\.)"),b=b.replace(/^\*\*\./,"(.+?\\.)*"),b=b.replace(/\.\*\*$/,"(\\..+?)*"),b=b.replace(/\.\*\./g,"(\\..+?\\.)"),b=b.replace(/^\*\./g,"(.+?\\.)"),b=b.replace(/\.\*$/g,"(\\..+?)"),(new RegExp(b)).test(a))},o=function(a,b){var c=[];for(var d in b)n(d,a)&&c.push({topic:d,value:b[d]});return c},p={cache:!0};e(q.prototype,{version:"1.0",subscribe:function(b,c,d,e,g){i(b),j(b),d=d||a,g=g||{};var h=f(),k={h:c,scope:d,data:e,sid:h,execedTime:0,config:g},m=b.split("."),n=0,p=m.length;(function(a,b,c,d){var e=a[b];b==a.length?d.h.push(c):(d.t[e]||(d.t[e]={t:{},h:[]}),arguments.callee.call(this,a,++b,c,d.t[e]))})(m,0,k,this.subTree);if(this.config.cache&&!!g.cache){var q=o(b,this.pubItems);for(n=0,p=q.length;n<p;n++)l(q[n].topic,q[n].value,[k])}return b+"^"+h},publish:function(a,b){k(a),j(a),this.pubItems[a]=b;var c=a.split("."),d;(function(a,b,c,d,e,f,g){var h=a[b];b==a.length?l(e,d,g&&g.isWildcard?c.t["**"].h:c.h,f):(c.t["**"]&&(c.t["**"].t[h]?arguments.callee.call(this,a,b+1,c.t["**"].t[h],d,e,f,{index:b,tree:c}):arguments.callee.call(this,a,b+1,c,d,e,f,{isWildcard:!0})),c.t[h]?arguments.callee.call(this,a,b+1,c.t[h],d,e,f):g&&!g.isWildcard&&arguments.callee.call(this,a,++g.index,g.tree,d,e,f,g),c.t["*"]&&arguments.callee.call(this,a,b+1,c.t["*"],d,e,f))})(c,0,this.subTree,b,a,f())},unsubscribe:function(a){var b=this,c=function(a){var a=a.split("^");a.length!=2&&g("illegal sid:"+a);var c=a[0].split("."),d=a[1];(function(a,b,c,d){var e=a[b];b==a.length?m(c.h,d):c.t[e]&&arguments.callee.call(this,a,++b,c.t[e],d)})(c,0,b.subTree,d)},a=a.split(";"),d=0,e=a.length;for(;d<e;d++)c(a[d])},wait:function(a,b,c,e,f){if(d.call(a)!=="[object Array]"||!a.length)return;f=f||{},f.topics={},f._topics={};var g=[],h=0,i=a.length,j;for(;h<i;h++)j=a[h],k(a[h]),f.topics[j]=null,f._topics[j]=!1;for(h=0;h<i;h++)g.push(this.subscribe(a[h],b,c,e,f));return g.join(";")}}),a.messagebus=new q,a.MessageBus=q})(window,undefined);

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
